import { useRef, useState } from "react";
import {
  clearAllData,
  exportBackup,
  importBackup,
  type BackupPayload,
} from "../db/database";

export function BackupScreen() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onExport() {
    setError("");
    const payload = await exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tamarind-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage("Backup downloaded.");
  }

  async function onImport(file: File) {
    setError("");
    setMessage("");
    try {
      const text = await file.text();
      const payload = JSON.parse(text) as BackupPayload;
      await importBackup(payload);
      setMessage("Backup restored. Reload recommended.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    }
  }

  async function onClear() {
    if (!confirm("Clear ALL local data? This cannot be undone.")) return;
    await clearAllData();
    setMessage("All data cleared. Defaults restored.");
  }

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Backup / Restore</h1>
          <p>Export or import the full IndexedDB dataset as JSON.</p>
        </div>
      </div>

      <div className="panel">
        <div className="row-actions">
          <button className="btn accent" type="button" onClick={() => void onExport()}>
            Download backup
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => fileRef.current?.click()}
          >
            Restore from file
          </button>
          <button className="btn danger" type="button" onClick={() => void onClear()}>
            Clear all data
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImport(f);
            e.target.value = "";
          }}
        />
        {message ? <p className="success">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </>
  );
}
