import { useState } from "react";
import { Text } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  clearAllData,
  exportBackup,
  importBackup,
  type BackupPayload,
} from "@tamarind/core";
import { useAppStore } from "../src/state/StoreContext";
import { Btn, ErrorText, Loading, Panel, Screen } from "../src/ui/primitives";
import { colors } from "../src/theme";

export default function BackupScreen() {
  const { store, ready, bump } = useAppStore();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <Loading />;

  return (
    <Screen title="Backup" subtitle="JSON export / import · offline">
      <Panel>
        <Text style={{ color: colors.muted }}>
          Same backup format as the web app (version 1). Share the file or restore from a previous
          export.
        </Text>
        {message ? <Text style={{ color: colors.brand }}>{message}</Text> : null}
        {error ? <ErrorText message={error} /> : null}
        <Btn
          label="Export backup"
          onPress={async () => {
            try {
              setError(null);
              const payload = await exportBackup(store);
              const path = `${FileSystem.cacheDirectory}tamarind-backup-${Date.now()}.json`;
              await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(path, { mimeType: "application/json" });
              }
              setMessage("Backup exported.");
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
        <Btn
          label="Import backup"
          variant="secondary"
          onPress={async () => {
            try {
              setError(null);
              const pick = await DocumentPicker.getDocumentAsync({
                type: "application/json",
                copyToCacheDirectory: true,
              });
              if (pick.canceled || !pick.assets?.[0]) return;
              const raw = await FileSystem.readAsStringAsync(pick.assets[0].uri);
              const payload = JSON.parse(raw) as BackupPayload;
              await importBackup(store, payload);
              bump();
              setMessage("Backup restored.");
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
        <Btn
          label="Clear all data"
          variant="danger"
          onPress={async () => {
            try {
              setError(null);
              await clearAllData(store);
              bump();
              setMessage("All data cleared; defaults restored.");
            } catch (e) {
              setError(e instanceof Error ? e.message : String(e));
            }
          }}
        />
      </Panel>
    </Screen>
  );
}
