import Link from "next/link";
import { NAV_ITEMS } from "../src/ui/nav/nav_items";

export default function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props;

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif" }}>
        <div style={{ display: "grid", gridTemplateColumns: "240px 1fr 320px", minHeight: "100vh" }}>
          {/* Sidebar */}
          <aside style={{ borderRight: "1px solid #eee", padding: 16 }}>
            <div style={{ fontWeight: 800, marginBottom: 12 }}>AI Assistant Manager</div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {NAV_ITEMS.map((it) => (
                <Link key={it.href} href={it.href} style={{ textDecoration: "none", color: "#111" }}>
                  {it.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main column */}
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            {/* Topbar */}
            <header style={{ borderBottom: "1px solid #eee", padding: "12px 16px", fontWeight: 600 }}>
              Platform Kernel
            </header>

            {/* MainContent */}
            <main style={{ padding: 16, minWidth: 0 }}>
              {children}
            </main>
          </div>

          {/* Inspector placeholder */}
          <aside style={{ borderLeft: "1px solid #eee", padding: 16, color: "#555" }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Inspector</div>
            <div style={{ fontSize: 13, lineHeight: 1.4 }}>
              Placeholder (M00-C). No business logic here.
            </div>
          </aside>
        </div>
      </body>
    </html>
  );
}
