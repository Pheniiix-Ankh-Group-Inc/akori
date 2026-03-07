import Link from "next/link"

const NAV_ITEMS = [
  { label: "Dashboard",  href: "/dashboard",  icon: "⊞" },
  { label: "Directory",  href: "/directory",  icon: "◎" },
  { label: "Events",     href: "/events",     icon: "◈" },
  { label: "Resources",  href: "/resources",  icon: "◧" },
  { label: "Messaging",  href: "/messaging",  icon: "◉" },
  { label: "Profile",    href: "/profile",    icon: "◯" },
  { label: "Settings",   href: "/settings",   icon: "◌" },
]

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="member-layout">
      <aside className="member-sidebar">
        <div className="member-sidebar-logo">
          <Link href="/" className="logo">
            Ako<em>ri</em>
          </Link>
        </div>

        <nav className="member-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="member-nav-link">
              <span className="member-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="member-sidebar-footer">
          <Link href="/api/auth/sign-out" className="member-nav-link">
            <span className="member-nav-icon">→</span>
            Sign out
          </Link>
        </div>
      </aside>

      <main className="member-main">
        {children}
      </main>
    </div>
  )
}