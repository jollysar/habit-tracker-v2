use std::{
    fs,
    io::Read,
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{AppHandle, Manager};
use tauri_plugin_sql::{Migration, MigrationKind};

const DATABASE_FILENAME: &str = "habit-tracker.db";
const PENDING_RESTORE_FILENAME: &str = "habit-tracker.restore-pending";

fn sqlite_file_is_valid(path: &Path) -> Result<(), String> {
    let metadata = fs::metadata(path).map_err(|error| format!("Unable to read backup: {error}"))?;
    if !metadata.is_file() || metadata.len() < 100 {
        return Err("The selected file is not a valid SQLite database.".into());
    }
    let mut file = fs::File::open(path).map_err(|error| format!("Unable to open backup: {error}"))?;
    let mut header = [0_u8; 16];
    file.read_exact(&mut header)
        .map_err(|error| format!("Unable to validate backup: {error}"))?;
    if &header != b"SQLite format 3\0" {
        return Err("The selected file is not a valid SQLite database.".into());
    }
    Ok(())
}

fn app_data_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map_err(|error| format!("Unable to locate application data: {error}"))
}

#[tauri::command]
fn write_text_export(path: String, contents: String) -> Result<String, String> {
    if path.trim().is_empty() {
        return Err("No export destination was selected.".into());
    }
    fs::write(&path, contents).map_err(|error| format!("Unable to write export: {error}"))?;
    Ok(path)
}

#[tauri::command]
fn backup_database(app: AppHandle, destination_path: String) -> Result<String, String> {
    if destination_path.trim().is_empty() {
        return Err("No backup destination was selected.".into());
    }
    let source = app_data_path(&app)?.join(DATABASE_FILENAME);
    sqlite_file_is_valid(&source)?;
    fs::copy(&source, &destination_path)
        .map_err(|error| format!("Unable to create database backup: {error}"))?;
    sqlite_file_is_valid(Path::new(&destination_path))?;
    Ok(destination_path)
}

#[tauri::command]
fn stage_database_restore(app: AppHandle, source_path: String) -> Result<String, String> {
    let source = PathBuf::from(source_path);
    sqlite_file_is_valid(&source)?;
    let app_data = app_data_path(&app)?;
    fs::create_dir_all(&app_data)
        .map_err(|error| format!("Unable to prepare the restore: {error}"))?;
    let pending = app_data.join(PENDING_RESTORE_FILENAME);
    fs::copy(&source, &pending)
        .map_err(|error| format!("Unable to stage the restore: {error}"))?;
    sqlite_file_is_valid(&pending)?;
    Ok("Restore validated. Restart Habit Tracker to apply it.".into())
}

fn apply_pending_restore(app: &AppHandle) -> Result<(), String> {
    let app_data = app_data_path(app)?;
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
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
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
}
