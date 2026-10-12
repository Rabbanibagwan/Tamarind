import { FormEvent, useState } from "react";
import { useLiveQuery } from "../lib/hooks";
import { deleteParty, listParties, upsertParty } from "../db/services";

export function FarmersScreen() {
  const farmers = useLiveQuery(() => listParties("farmers"), [], []);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [village, setVillage] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | undefined>();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!name.trim()) throw new Error("Name is required");
      await upsertParty("farmers", { id: editingId, name, phone, village });
      setName("");
      setPhone("");
      setVillage("");
      setEditingId(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Farmers</h1>
          <p>Master list for action diary and patti settlements.</p>
        </div>
      </div>
      <div className="panel no-print">
        <h2>{editingId ? "Edit farmer" : "Add farmer"}</h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Phone
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              Village
              <input value={village} onChange={(e) => setVillage(e.target.value)} />
            </label>
          </div>
          <div className="row-actions">
            <button className="btn accent" type="submit">
              {editingId ? "Update" : "Save"}
            </button>
            {editingId ? (
              <button
                className="btn secondary"
                type="button"
                onClick={() => {
                  setEditingId(undefined);
                  setName("");
                  setPhone("");
                  setVillage("");
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </div>
      <div className="panel">
        <h2>All farmers ({farmers.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Village</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {farmers.map((f) => (
              <tr key={f.id}>
                <td>{f.name}</td>
                <td>{f.phone || "—"}</td>
                <td>{f.village || "—"}</td>
                <td className="no-print">
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => {
                      setEditingId(f.id);
                      setName(f.name);
                      setPhone(f.phone ?? "");
                      setVillage(f.village ?? "");
                    }}
                  >
                    Edit
                  </button>{" "}
                  <button
                    className="btn danger"
                    type="button"
                    onClick={() => void deleteParty("farmers", f.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!farmers.length ? (
              <tr>
                <td colSpan={4} className="muted">
                  No farmers yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
