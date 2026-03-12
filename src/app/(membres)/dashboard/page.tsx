import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const user = session.user

  const STATS = [
    { label: "Plan",      value: "Réseau", sub: "Free"        },
    { label: "Events",    value: "3",      sub: "Upcoming"    },
    { label: "Resources", value: "12",     sub: "Available"   },
    { label: "Members",   value: "248",    sub: "In directory" },
  ]

  const EVENTS = [
    { month: "Mar", day: "15", name: "AnbaChain Summit 2026",     location: "Montréal" },
    { month: "Mar", day: "22", name: "DeFi & Financial Inclusion", location: "Online"   },
    { month: "Apr", day: "18", name: "Governance Roundtable",      location: "Paris"    },
  ]

  const LINKS = [
    { label: "Member Directory", href: "/directory", desc: "Connect with members"   },
    { label: "Resources",        href: "/resources", desc: "Reports & tutorials"    },
    { label: "Messaging",        href: "/messaging", desc: "Private conversations"  },
    { label: "My Profile",       href: "/profile",   desc: "Edit your information"  },
    { label: "Settings",         href: "/settings",  desc: "Account & subscription" },
  ]

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <p className="page-subtitle">Member Space</p>
          <h1 className="page-title">
            Welcome, <em>{user.name?.split(" ")[0] ?? "Member"}</em>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {user.image ? (
            <img src={user.image} alt={user.name ?? ""} className="avatar" />
          ) : (
            <div className="avatar-placeholder">
              {user.name?.slice(0, 2).toUpperCase() ?? "ME"}
            </div>
          )}
          <div>
            <p className="text-sm" style={{ color: "var(--blanc)", fontWeight: 500 }}>{user.name}</p>
            <p className="text-xs">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {STATS.map((stat) => (
          <div key={stat.label} className="stat-card">
            <p className="stat-label">{stat.label}</p>
            <p className="stat-value">{stat.value}</p>
            <p className="stat-sub">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Dashboard grid */}
      <div className="dash-grid">

        {/* Upcoming events */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Upcoming Events</span>
            <a href="/events" className="dash-card-link">See all →</a>
          </div>
          {EVENTS.map((ev, i) => (
            <div key={i} className="dash-row">
              <div className="stat-card" style={{ width: "44px", padding: "0.4rem 0", textAlign: "center", flexShrink: 0 }}>
                <p className="stat-label" style={{ marginBottom: "0.1rem" }}>{ev.month}</p>
                <p className="stat-value" style={{ fontSize: "1.2rem" }}>{ev.day}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: "var(--blanc)", fontWeight: 500 }}>{ev.name}</p>
                <p className="text-xs">{ev.location}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick access */}
        <div className="dash-card">
          <div className="dash-card-header">
            <span className="dash-card-title">Quick Access</span>
          </div>
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="dash-row" style={{ textDecoration: "none" }}>
              <div>
                <p className="text-sm" style={{ color: "var(--blanc)", fontWeight: 500 }}>{link.label}</p>
                <p className="text-xs">{link.desc}</p>
              </div>
              <span className="text-xs" style={{ marginLeft: "auto" }}>→</span>
            </a>
          ))}
        </div>
      </div>
    </>
  )
}