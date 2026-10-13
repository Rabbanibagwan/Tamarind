# Tamarind Billing App

Local-first mandi billing for a merchant who intermediates farmers and vendors via auction.

## Monorepo

| Package | Path | Role |
| --- | --- | --- |
| `@tamarind/core` | `packages/core` | Shared domain math, types, `DataStore` API, services, backup |
| `@tamarind/web` | `apps/web` | Vite + React + Dexie (IndexedDB) — **preserved web app** |
| `@tamarind/mobile` | `apps/mobile` | Expo + React Native + SQLite — Android-first + iPhone |

## Commands

```bash
npm install
npm test                 # core + web tests (canonical ₹3640 / ₹4416)
npm run dev:web          # http://localhost:5173
npm run dev:mobile       # Expo (scan QR with Expo Go / dev client)
```

## Workflow (same on web + mobile)

1. **Farmers / Vendors** — master data  
2. **Action Diary** — lots with per-bag weights + weight slip print/reprint  
3. **Auction** — rate + split bags across vendors  
4. **Farmer Patti** — 10% commission, hamali, bhada once, stationery  
5. **Vendor Bills** — 2% add-on, hamali, cess  
6. **Payments / Ledgers / Reports / Settings / Backup**

Suit default: `FLOOR(weight / 20)` per bag, snapshotted onto each lot so Settings changes never rewrite finalized documents.

## Thermal printing (mobile)

- Abstraction: select / status / test / reprint (same document id — no duplicate bills).
- **Android:** ESC/POS Bluetooth Classic in a **development build** (`npx expo run:android` or EAS). Expo Go cannot load Classic BT modules.
- **iOS:** Classic SPP generally unavailable; BLE/MFi only. Many mandi printers are Classic-only.

## Isolation

This repository is **Tamarind only**. Do not connect RateBolo, ProTool, LemonMandi, or other remotes here.
