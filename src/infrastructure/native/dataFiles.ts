import { invoke, isTauri } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

export type TextExportFormat = "json" | "csv";

function dateStamp(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function downloadInBrowser(filename: string, contents: string, mimeType: string): string {
  const url = URL.createObjectURL(new Blob([contents], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
  return filename;
}

export async function saveTextExport(
  format: TextExportFormat,
  contents: string,
): Promise<string | null> {
  const filename = `habit-tracker-export-${dateStamp()}.${format}`;
  if (!isTauri()) {
    return downloadInBrowser(
      filename,
      contents,
      format === "json" ? "application/json" : "text/csv",
    );
  }
  const path = await save({
    defaultPath: filename,
    filters: [{
      name: format === "json" ? "JSON export" : "CSV export",
      extensions: [format],
    }],
  });
  if (!path) return null;
  return invoke<string>("write_text_export", { path, contents });
}

export async function saveDatabaseBackup(): Promise<string | null> {
  if (!isTauri()) {
    throw new Error("Database backups are available in the installed desktop app.");
  }
  const path = await save({
    defaultPath: `habit-tracker-backup-${dateStamp()}.db`,
    filters: [{ name: "Habit Tracker database", extensions: ["db"] }],
  });
  if (!path) return null;
  return invoke<string>("backup_database", { destinationPath: path });
}

export async function chooseAndStageDatabaseRestore(): Promise<string | null> {
  if (!isTauri()) {
    throw new Error("Database restore is available in the installed desktop app.");
  }
  const path = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Habit Tracker database", extensions: ["db"] }],
  });
  if (!path || Array.isArray(path)) return null;
  return invoke<string>("stage_database_restore", { sourcePath: path });
}
