import { FormEvent, useEffect, useState } from "react";
import { getSettings, updateSettings } from "../db/database";
import { suitForBag, ruleFromSettings } from "../domain/suit";
import { useLiveQuery } from "../lib/hooks";

export function SettingsScreen() {
  const settings = useLiveQuery(() => getSettings(), [], null);
  const [form, setForm] = useState({
    merchantName: "",
    merchantAddress: "",
    merchantPhone: "",
    suitDivisor: "20",
    farmerCommissionPercent: "10",
    vendorCommissionPercent: "2",
    defaultHamaliPerBag: "8.00",
    defaultBhada: "40.00",
    defaultStationery: "20.00",
    defaultVendorHamaliPerBag: "10.00",
    defaultCessPercent: "0",
    printWidthMm: "80" as "80" | "58",
  });
  const [ok, setOk] = useState("");

  useEffect(() => {
    if (!settings) return;
    setForm({
      merchantName: settings.merchantName,
      merchantAddress: settings.merchantAddress,
      merchantPhone: settings.merchantPhone,
      suitDivisor: String(settings.suitDivisor),
      farmerCommissionPercent: String(settings.farmerCommissionPercent),
      vendorCommissionPercent: String(settings.vendorCommissionPercent),
      defaultHamaliPerBag: settings.defaultHamaliPerBag,
      defaultBhada: settings.defaultBhada,
      defaultStationery: settings.defaultStationery,
      defaultVendorHamaliPerBag: settings.defaultVendorHamaliPerBag,
      defaultCessPercent: String(settings.defaultCessPercent),
      printWidthMm: String(settings.printWidthMm) as "80" | "58",
    });
  }, [settings]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await updateSettings({
      merchantName: form.merchantName,
      merchantAddress: form.merchantAddress,
      merchantPhone: form.merchantPhone,
      suitDivisor: Number(form.suitDivisor) || 20,
      farmerCommissionPercent: Number(form.farmerCommissionPercent) || 10,
      vendorCommissionPercent: Number(form.vendorCommissionPercent) || 2,
      defaultHamaliPerBag: form.defaultHamaliPerBag,
      defaultBhada: form.defaultBhada,
      defaultStationery: form.defaultStationery,
      defaultVendorHamaliPerBag: form.defaultVendorHamaliPerBag,
      defaultCessPercent: Number(form.defaultCessPercent) || 0,
      printWidthMm: form.printWidthMm === "58" ? 58 : 80,
    });
    setOk("Settings saved. New lots use the updated suit rule; finalized docs keep their snapshot.");
  }

  const previewRule = ruleFromSettings(Number(form.suitDivisor) || 20);
  const preview42 = suitForBag(42, previewRule);

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Settings</h1>
          <p>
            Configure suit divisor, commissions, and default charges. Changing suit never rewrites
            finalized lots or bills.
          </p>
        </div>
      </div>

      <div className="panel">
        <form onSubmit={onSubmit}>
          <h2>Merchant</h2>
          <div className="form-grid">
            <label>
              Name
              <input
                value={form.merchantName}
                onChange={(e) => setForm({ ...form, merchantName: e.target.value })}
              />
            </label>
            <label>
              Phone
              <input
                value={form.merchantPhone}
                onChange={(e) => setForm({ ...form, merchantPhone: e.target.value })}
              />
            </label>
            <label>
              Address
              <input
                value={form.merchantAddress}
                onChange={(e) => setForm({ ...form, merchantAddress: e.target.value })}
              />
            </label>
          </div>

          <h2 style={{ marginTop: "1.25rem" }}>Suit rule</h2>
          <div className="form-grid">
            <label>
              Divisor (default 20 → FLOOR(w/20))
              <input
                value={form.suitDivisor}
                onChange={(e) => setForm({ ...form, suitDivisor: e.target.value })}
              />
            </label>
            <label>
              Print width
              <select
                value={form.printWidthMm}
                onChange={(e) =>
                  setForm({ ...form, printWidthMm: e.target.value as "80" | "58" })
                }
              >
                <option value="80">80 mm</option>
                <option value="58">58 mm</option>
              </select>
            </label>
          </div>
          <p className="muted">
            Preview: 42 kg → suit {preview42} kg with current divisor. Use divisor 14 if you need
            42→3.
          </p>

          <h2 style={{ marginTop: "1.25rem" }}>Defaults</h2>
          <div className="form-grid">
            <label>
              Farmer commission %
              <input
                value={form.farmerCommissionPercent}
                onChange={(e) =>
                  setForm({ ...form, farmerCommissionPercent: e.target.value })
                }
              />
            </label>
            <label>
              Vendor commission %
              <input
                value={form.vendorCommissionPercent}
                onChange={(e) =>
                  setForm({ ...form, vendorCommissionPercent: e.target.value })
                }
              />
            </label>
            <label>
              Hamali / bag (farmer)
              <input
                value={form.defaultHamaliPerBag}
                onChange={(e) => setForm({ ...form, defaultHamaliPerBag: e.target.value })}
              />
            </label>
            <label>
              Bhada (once)
              <input
                value={form.defaultBhada}
                onChange={(e) => setForm({ ...form, defaultBhada: e.target.value })}
              />
            </label>
            <label>
              Stationery
              <input
                value={form.defaultStationery}
                onChange={(e) => setForm({ ...form, defaultStationery: e.target.value })}
              />
            </label>
            <label>
              Hamali / bag (vendor)
              <input
                value={form.defaultVendorHamaliPerBag}
                onChange={(e) =>
                  setForm({ ...form, defaultVendorHamaliPerBag: e.target.value })
                }
              />
            </label>
            <label>
              Cess % of base
              <input
                value={form.defaultCessPercent}
                onChange={(e) => setForm({ ...form, defaultCessPercent: e.target.value })}
              />
            </label>
          </div>

          <div className="row-actions">
            <button className="btn accent" type="submit">
              Save settings
            </button>
          </div>
          {ok ? <p className="success">{ok}</p> : null}
        </form>
      </div>
    </>
  );
}
