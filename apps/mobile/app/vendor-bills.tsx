import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  createVendorBill,
  formatINR,
  listParties,
  listVendorBills,
  unbilledAllocationsForVendor,
  type Auction,
  type AuctionAllocation,
  type Party,
  type VendorBillDoc,
} from "@tamarind/core";
import { useAppStore } from "../src/state/StoreContext";
import { Btn, ErrorText, Field, Loading, Panel, Row, Screen } from "../src/ui/primitives";
import { colors } from "../src/theme";
import { formatSlipLines } from "../src/print/printer";

export default function VendorBillsScreen() {
  const { store, printer, ready, bump, refreshKey } = useAppStore();
  const [vendors, setVendors] = useState<Party[]>([]);
  const [bills, setBills] = useState<VendorBillDoc[]>([]);
  const [unbilled, setUnbilled] = useState<
    Array<{ auction: Auction; allocation: AuctionAllocation }>
  >([]);
  const [vendorId, setVendorId] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [hamali, setHamali] = useState("100");
  const [cess, setCess] = useState("32");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    void Promise.all([listParties(store, "vendors"), listVendorBills(store)]).then(([v, b]) => {
      setVendors(v);
      setBills(b);
      if (!vendorId && v[0]) setVendorId(v[0].id);
    });
  }, [store, ready, refreshKey, vendorId]);

  useEffect(() => {
    if (!ready || !vendorId) return;
    void unbilledAllocationsForVendor(store, vendorId).then((rows) => {
      setUnbilled(rows);
      setSelected(rows.map((r) => r.allocation.id));
    });
  }, [store, ready, vendorId, refreshKey]);

  if (!ready) return <Loading />;

  return (
    <Screen title="Vendor Bills" subtitle="2% add-on · allocation lines">
      <Panel>
        {vendors.map((v) => (
          <Row
            key={v.id}
            title={v.name}
            meta={v.id === vendorId ? "Selected" : v.phone || v.id}
            onPress={() => setVendorId(v.id)}
          />
        ))}
        {unbilled.map((row) => {
          const on = selected.includes(row.allocation.id);
          return (
            <Row
              key={row.allocation.id}
              title={`Lot #${row.auction.lotNumber} · ${row.allocation.bagCount} bags`}
              meta={on ? "Included" : "Tap to toggle"}
              onPress={() =>
                setSelected((s) =>
                  on ? s.filter((x) => x !== row.allocation.id) : [...s, row.allocation.id],
                )
              }
            />
          );
        })}
        <Field label="Hamali" value={hamali} onChangeText={setHamali} keyboardType="decimal-pad" />
        <Field label="Cess" value={cess} onChangeText={setCess} keyboardType="decimal-pad" />
        {error ? <ErrorText message={error} /> : null}
        <Btn
          label="Create vendor bill"
          onPress={async () => {
            try {
              setError(null);
              const refs = unbilled
                .filter((r) => selected.includes(r.allocation.id))
                .map((r) => ({ auctionId: r.auction.id, allocationId: r.allocation.id }));
              const doc = await createVendorBill(store, {
                vendorId,
                allocationRefs: refs,
                hamali,
                cess,
              });
              bump();
              await printer.print({
                kind: "vendor_bill",
                documentId: doc.id,
                title: `Bill #${doc.billNumber}`,
                lines: formatSlipLines({
                  merchantName: "Tamarind Mandi",
                  title: `VENDOR BILL #${doc.billNumber}`,
                  documentId: doc.id,
                  body: [doc.vendorName, `Total ${doc.total}`],
                }),
              });
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      </Panel>
      <Panel>
        <Text style={{ fontWeight: "700", color: colors.ink }}>Bills</Text>
        {bills.map((b) => (
          <Row
            key={b.id}
            title={`#${b.billNumber} · ${b.vendorName}`}
            meta={`Total ${formatINR(b.total)} · bal ${formatINR(b.balanceAmount)}`}
            onPress={async () => {
              await printer.print({
                kind: "vendor_bill",
                documentId: b.id,
                title: `Bill #${b.billNumber}`,
                lines: formatSlipLines({
                  merchantName: "Tamarind Mandi",
                  title: `VENDOR BILL #${b.billNumber}`,
                  documentId: b.id,
                  reprint: true,
                  body: [b.vendorName, `Total ${b.total}`],
                }),
              });
            }}
          />
        ))}
      </Panel>
    </Screen>
  );
}
