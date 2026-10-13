import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { DataStore } from "@tamarind/core";
import { ensureSettings } from "@tamarind/core";
import { createSqliteStore } from "../db/sqliteStore";
import { createThermalPrinter } from "../print/printer";
import type { ThermalPrinter } from "../print/types";

type StoreContextValue = {
  store: DataStore;
  printer: ThermalPrinter;
  ready: boolean;
  error: string | null;
  refreshKey: number;
  bump: () => void;
};

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const store = useMemo(() => createSqliteStore(), []);
  const printer = useMemo(() => createThermalPrinter(), []);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await ensureSettings(store);
        if (!cancelled) setReady(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [store]);

  const value = useMemo(
    () => ({ store, printer, ready, error, refreshKey, bump }),
    [store, printer, ready, error, refreshKey, bump],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useAppStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useAppStore outside StoreProvider");
  return ctx;
}
