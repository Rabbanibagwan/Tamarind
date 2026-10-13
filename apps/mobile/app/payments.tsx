import { useEffect, useState } from "react";
import { Text } from "react-native";
import {
  formatINR,
  listPattis,
  listPayments,
  listVendorBills,
  recordPayment,
  type FarmerPattiDoc,
  type Payment,
  type VendorBillDoc,
} from "@tamarind/core";
import { useAppStore } from "../src/state/StoreContext";
import { Btn, ErrorText, Field, Loading, Panel, Row, Screen } from "../src/ui/primitives";
import { colors } from "../src/theme";

export default function PaymentsScreen() {
  const { store, ready, bump, refreshKey } = useAppStore();
  const [pattis, setPattis] = useState<FarmerPattiDoc[]>([]);
  const [bills, setBills] = useState<VendorBillDoc[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [docType, setDocType] = useState<"patti" | "vendor_bill">("patti");
  const [docId, setDocId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    void Promise.all([listPattis(store), listVendorBills(store), listPayments(store)]).then(
      ([p, b, pay]) => {
        setPattis(p.filter((x) => Number(x.balanceAmount) > 0));
        setBills(b.filter((x) => Number(x.balanceAmount) > 0));
        setPayments(pay);
      },
    );
  }, [store, ready, refreshKey]);

  if (!ready) return <Loading />;

  return (
    <Screen title="Payments" subtitle="Partial payments allowed">
      <Panel>
        <Row
          title="Pay farmer patti"
          meta={docType === "patti" ? "Selected" : "Tap"}
          onPress={() => setDocType("patti")}
        />
        <Row
          title="Collect vendor bill"
          meta={docType === "vendor_bill" ? "Selected" : "Tap"}
          onPress={() => setDocType("vendor_bill")}
        />
        {(docType === "patti" ? pattis : bills).map((d) => {
          const id = d.id;
          const title =
            docType === "patti"
              ? `Patti #${(d as FarmerPattiDoc).pattiNumber} · ${(d as FarmerPattiDoc).farmerName}`
              : `Bill #${(d as VendorBillDoc).billNumber} · ${(d as VendorBillDoc).vendorName}`;
          const bal =
            docType === "patti"
              ? (d as FarmerPattiDoc).balanceAmount
              : (d as VendorBillDoc).balanceAmount;
          return (
            <Row
              key={id}
              title={title}
              meta={`Balance ${formatINR(bal)}${docId === id ? " · selected" : ""}`}
              onPress={() => {
                setDocId(id);
                setAmount(bal);
              }}
            />
          );
        })}
        <Field label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        {error ? <ErrorText message={error} /> : null}
        <Btn
          label="Record payment"
          onPress={async () => {
            try {
              setError(null);
              await recordPayment(store, {
                partyType: docType === "patti" ? "farmer" : "vendor",
                docType,
                docId,
                amount,
              });
              setAmount("");
              bump();
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      </Panel>
      <Panel>
        <Text style={{ fontWeight: "700", color: colors.ink }}>Recent</Text>
        {payments.map((p) => (
          <Row
            key={p.id}
            title={`${p.partyName} · ${formatINR(p.amount)}`}
            meta={`${p.docType} #${p.docNumber} · ${p.mode} · ${p.date}`}
          />
        ))}
      </Panel>
    </Screen>
  );
}
