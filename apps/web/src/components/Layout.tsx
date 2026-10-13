import { NavLink, Outlet } from "react-router-dom";

const links = [
  ["/", "Dashboard"],
  ["/farmers", "Farmers"],
  ["/vendors", "Vendors"],
  ["/diary", "Action Diary"],
  ["/auction", "Auction"],
  ["/patti", "Farmer Patti"],
  ["/vendor-bills", "Vendor Bills"],
  ["/payments", "Payments"],
  ["/ledgers", "Ledgers"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
  ["/backup", "Backup"],
] as const;

export function Layout() {
  return (
    <div className="app-shell">
      <aside className="nav no-print">
        <div className="brand">
          <div className="brand-mark">Tamarind</div>
          <div className="brand-sub">Mandi billing · auction · patti</div>
        </div>
        <nav className="nav-links">
          {links.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
