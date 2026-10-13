import { FormEvent, useState } from "react";
import { useLiveQuery } from "../lib/hooks";
import { deleteParty, listParties, upsertParty } from "../db/services";

export function VendorsScreen() {
  const vendors = useLiveQuery(() => listParties("vendors"), [], []);
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
      await upsertParty("vendors", { id: editingId, name, phone, village });
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
          <h1>Vendors</h1>
          <p>Buyers at auction — used for split allocation and vendor bills.</p>
        </div>
      </div>
      <div className="panel no-print">
        <h2>{editingId ? "Edit vendor" : "Add vendor"}</h2>
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
              Place
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
        <h2>All vendors ({vendors.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Place</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.id}>
                <td>{v.name}</td>
                <td>{v.phone || "—"}</td>
                <td>{v.village || "—"}</td>
                <td className="no-print">
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => {
                      setEditingId(v.id);
                      setName(v.name);
                      setPhone(v.phone ?? "");
                      setVillage(v.village ?? "");
                    }}
                  >
                    Edit
                  </button>{" "}
                  <button
                    className="btn danger"
                    type="button"
                    onClick={() => void deleteParty("vendors", v.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!vendors.length ? (
              <tr>
                <td colSpan={4} className="muted">
                  No vendors yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
