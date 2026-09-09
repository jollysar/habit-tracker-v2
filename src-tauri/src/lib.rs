use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_sql::{Migration, MigrationKind};

const DATABASE_FILENAME: &str = "habit-tracker.db";
const PENDING_RESTORE_FILENAME: &str = "habit-tracker.restore-pending";
const LEGACY_IDENTIFIER: &str = "com.tsar.habit-tracker";

fn sqlite_file_is_valid(path: &Path) -> Result<(), String> {
    let metadata = fs::metadata(path).map_err(|error| format!("Unable to read backup: {error}"))?;
    if !metadata.is_file() || metadata.len() < 100 {
        return Err("The selected file is not a valid SQLite database.".into());
    }
    let mut file =
        fs::File::open(path).map_err(|error| format!("Unable to open backup: {error}"))?;
    let mut header = [0_u8; 16];
    file.read_exact(&mut header)
        .map_err(|error| format!("Unable to validate backup: {error}"))?;
    if &header != b"SQLite format 3\0" {
        return Err("The selected file is not a valid SQLite database.".into());
    }
    Ok(())
}

fn app_database_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_config_dir()
        .map_err(|error| format!("Unable to locate application data: {error}"))
}

fn migrate_legacy_database_files(current_dir: &Path, legacy_dir: &Path) -> Result<(), String> {
    let current_database = current_dir.join(DATABASE_FILENAME);
    if current_database.exists() {
        return Ok(());
    }

    let legacy_database = legacy_dir.join(DATABASE_FILENAME);
    if !legacy_database.exists() {
        return Ok(());
    }

    sqlite_file_is_valid(&legacy_database)?;
    fs::create_dir_all(&current_dir)
        .map_err(|error| format!("Unable to prepare the Habitree data directory: {error}"))?;

    // Copy the main database last so an interrupted migration is retried next launch.
    for suffix in ["-wal", "-shm", ""] {
        let source = legacy_dir.join(format!("{DATABASE_FILENAME}{suffix}"));
        if source.exists() {
            let destination = current_dir.join(format!("{DATABASE_FILENAME}{suffix}"));
            fs::copy(&source, &destination)
                .map_err(|error| format!("Unable to migrate existing Habitree data: {error}"))?;
        }
    }

    sqlite_file_is_valid(&current_database)?;
    Ok(())
}

fn migrate_legacy_database(app: &AppHandle) -> Result<(), String> {
    let current_dir = app_database_path(app)?;
    let data_root = current_dir
        .parent()
        .ok_or_else(|| "Unable to locate the legacy application data directory.".to_string())?;
    migrate_legacy_database_files(&current_dir, &data_root.join(LEGACY_IDENTIFIER))
}

fn validate_suggested_filename(filename: &str, extension: &str) -> Result<(), String> {
    if filename.is_empty()
        || !filename.chars().all(|character| {
            character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.')
        })
        || filename.contains("..")
        || Path::new(filename)
            .extension()
            .and_then(|value| value.to_str())
            != Some(extension)
    {
        return Err("The suggested filename is invalid.".into());
    }
    Ok(())
}

#[tauri::command]
async fn write_text_export(
    app: AppHandle,
    suggested_filename: String,
    extension: String,
    contents: String,
) -> Result<Option<String>, String> {
    if !matches!(extension.as_str(), "json" | "csv") {
        return Err("Unsupported export format.".into());
    }
    validate_suggested_filename(&suggested_filename, &extension)?;
    let Some(destination) = app
        .dialog()
        .file()
        .set_title("Export Habitree data")
        .set_file_name(&suggested_filename)
        .add_filter(
            format!("{} export", extension.to_uppercase()),
            &[&extension],
        )
        .blocking_save_file()
    else {
        return Ok(None);
    };
    let destination = destination
        .into_path()
        .map_err(|error| format!("Unable to use the selected export destination: {error}"))?;
    fs::write(&destination, contents)
        .map_err(|error| format!("Unable to write export: {error}"))?;
    Ok(Some(destination.to_string_lossy().into_owned()))
}

#[tauri::command]
async fn backup_database(
    app: AppHandle,
    suggested_filename: String,
) -> Result<Option<String>, String> {
    validate_suggested_filename(&suggested_filename, "db")?;
    let Some(destination) = app
        .dialog()
        .file()
        .set_title("Back up Habitree")
        .set_file_name(&suggested_filename)
        .add_filter("Habitree database", &["db"])
        .blocking_save_file()
    else {
        return Ok(None);
    };
    let destination = destination
        .into_path()
        .map_err(|error| format!("Unable to use the selected backup destination: {error}"))?;
    let source = app_database_path(&app)?.join(DATABASE_FILENAME);
    sqlite_file_is_valid(&source)?;
    fs::copy(&source, &destination)
        .map_err(|error| format!("Unable to create database backup: {error}"))?;
    sqlite_file_is_valid(&destination)?;
    Ok(Some(destination.to_string_lossy().into_owned()))
}

#[tauri::command]
async fn stage_database_restore(app: AppHandle) -> Result<Option<String>, String> {
    let Some(source) = app
        .dialog()
        .file()
        .set_title("Restore a Habitree backup")
        .add_filter("Habitree database", &["db"])
        .blocking_pick_file()
    else {
        return Ok(None);
    };
    let source = source
        .into_path()
        .map_err(|error| format!("Unable to use the selected backup: {error}"))?;
    sqlite_file_is_valid(&source)?;
    let app_data = app_database_path(&app)?;
    fs::create_dir_all(&app_data)
        .map_err(|error| format!("Unable to prepare the restore: {error}"))?;
    let pending = app_data.join(PENDING_RESTORE_FILENAME);
    fs::copy(&source, &pending).map_err(|error| format!("Unable to stage the restore: {error}"))?;
    sqlite_file_is_valid(&pending)?;
    Ok(Some(
        "Restore validated. Restart Habitree to apply it.".into(),
    ))
}

fn apply_pending_restore(app: &AppHandle) -> Result<(), String> {
    let app_data = app_database_path(app)?;
    let pending = app_data.join(PENDING_RESTORE_FILENAME);
    if !pending.exists() {
        return Ok(());
    }
    sqlite_file_is_valid(&pending)?;
    let database = app_data.join(DATABASE_FILENAME);
    let safety_backup = if database.exists() {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|error| format!("Unable to create restore timestamp: {error}"))?
            .as_secs();
        let safety_backup = app_data.join(format!("habit-tracker.pre-restore-{timestamp}.db"));
        fs::rename(&database, &safety_backup)
            .map_err(|error| format!("Unable to preserve the current database: {error}"))?;
        Some(safety_backup)
    } else {
        None
    };
    if let Err(error) = fs::rename(&pending, &database) {
        if let Some(safety_backup) = &safety_backup {
            let _ = fs::rename(safety_backup, &database);
        }
        return Err(format!("Unable to apply the staged restore: {error}"));
    }
    for suffix in ["-wal", "-shm"] {
        let auxiliary = app_data.join(format!("{DATABASE_FILENAME}{suffix}"));
        if auxiliary.exists() {
            let _ = fs::remove_file(auxiliary);
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_core_habit_schema",
            sql: include_str!("../migrations/0001_core_habit_schema.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_default_schedule_trigger",
            sql: include_str!("../migrations/0002_default_schedule_trigger.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "seed_default_categories",
            sql: include_str!("../migrations/0003_seed_default_categories.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "categorise_starter_habits",
            sql: include_str!("../migrations/0004_categorise_starter_habits.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 5,
            description: "version_schedule_changes_atomically",
            sql: include_str!("../migrations/0005_version_schedule_changes_atomically.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "add_partial_habit_progress",
            sql: include_str!("../migrations/0006_add_partial_habit_progress.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "add_habit_plant_type",
            sql: include_str!("../migrations/0007_add_habit_plant_type.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri::plugin::Builder::<_, ()>::new("legacy-data-migration")
                .setup(|app, _| {
                    migrate_legacy_database(app)
                        .map_err(|error| -> Box<dyn std::error::Error> { error.into() })?;
                    Ok(())
                })
                .build(),
        )
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:habit-tracker.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            write_text_export,
            backup_database,
            stage_database_restore
        ])
        .setup(|app| {
            apply_pending_restore(&app.handle())
                .map_err(|error| -> Box<dyn std::error::Error> { error.into() })?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_path(label: &str) -> PathBuf {
        let unique = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock should be valid")
            .as_nanos();
        std::env::temp_dir().join(format!("habit-tracker-{label}-{unique}.db"))
    }

    #[test]
    fn accepts_a_sqlite_backup_header() {
        let path = test_path("valid");
        let mut bytes = vec![0_u8; 100];
        bytes[..16].copy_from_slice(b"SQLite format 3\0");
        fs::write(&path, bytes).expect("test database should be written");
        assert!(sqlite_file_is_valid(&path).is_ok());
        fs::remove_file(path).expect("test database should be removed");
    }

    #[test]
    fn rejects_non_sqlite_restore_files() {
        let path = test_path("invalid");
        fs::write(&path, vec![b'x'; 100]).expect("test file should be written");
        assert!(sqlite_file_is_valid(&path).is_err());
        fs::remove_file(path).expect("test file should be removed");
    }

    #[test]
    fn accepts_safe_export_and_backup_filenames() {
        assert!(validate_suggested_filename("habitree-export-2026-09-09.json", "json").is_ok());
        assert!(validate_suggested_filename("habitree_backup.db", "db").is_ok());
    }

    #[test]
    fn rejects_paths_and_unexpected_export_extensions() {
        assert!(validate_suggested_filename("../private.json", "json").is_err());
        assert!(validate_suggested_filename("folder/export.json", "json").is_err());
        assert!(validate_suggested_filename("habitree-export.html", "json").is_err());
    }

    #[test]
    fn migrates_the_legacy_database_without_removing_it() {
        let root = test_path("migration-root").with_extension("");
        let legacy_dir = root.join(LEGACY_IDENTIFIER);
        let current_dir = root.join("com.jollysar.habitree");
        fs::create_dir_all(&legacy_dir).expect("legacy directory should be created");

        let legacy_database = legacy_dir.join(DATABASE_FILENAME);
        let mut bytes = vec![0_u8; 100];
        bytes[..16].copy_from_slice(b"SQLite format 3\0");
        fs::write(&legacy_database, &bytes).expect("legacy database should be written");

        migrate_legacy_database_files(&current_dir, &legacy_dir)
            .expect("legacy database should migrate");

        assert_eq!(
            fs::read(current_dir.join(DATABASE_FILENAME)).expect("migrated database should exist"),
            bytes
        );
        assert!(legacy_database.exists());

        fs::remove_dir_all(root).expect("test directories should be removed");
    }
}
