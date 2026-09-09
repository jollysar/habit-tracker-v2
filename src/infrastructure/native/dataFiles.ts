import { invoke, isTauri } from "@tauri-apps/api/core";

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
  const filename = `habitree-export-${dateStamp()}.${format}`;
  if (!isTauri()) {
    return downloadInBrowser(
      filename,
      contents,
      format === "json" ? "application/json" : "text/csv",
    );
  }
  return invoke<string | null>("write_text_export", {
    suggestedFilename: filename,
    extension: format,
    contents,
  });
}

export async function saveDatabaseBackup(): Promise<string | null> {
  if (!isTauri()) {
    throw new Error("Database backups are available in the installed desktop app.");
  }
  return invoke<string | null>("backup_database", {
    suggestedFilename: `habitree-backup-${dateStamp()}.db`,
  });
}

export async function chooseAndStageDatabaseRestore(): Promise<string | null> {
  if (!isTauri()) {
    throw new Error("Database restore is available in the installed desktop app.");
  }
  return invoke<string | null>("stage_database_restore");
}
