# Tamarind Billing App

Local-first mandi billing for a merchant who intermediates farmers and vendors via auction.

## Stack

- Vite + React + TypeScript
- Dexie (IndexedDB) persistence — offline-capable
- `decimal.js` for money/weight math
- Vitest for domain + workflow tests

## Commands

```bash
npm install
npm run dev        # http://localhost:5173
npm test
npm run typecheck
npm run build
```

## Workflow

1. **Farmers / Vendors** — master data  
2. **Action Diary** — lots with per-bag weights + weight slip print/reprint  
3. **Auction** — rate + split bags across vendors  
4. **Farmer Patti** — 10% commission, hamali, bhada once, stationery  
5. **Vendor Bills** — 2% add-on, hamali, cess  
6. **Payments / Ledgers / Reports / Settings / Backup**

Suit default: `FLOOR(weight / 20)` per bag, snapshotted onto each lot so Settings changes never rewrite finalized documents.
