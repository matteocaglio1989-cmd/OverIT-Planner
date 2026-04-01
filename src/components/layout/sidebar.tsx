"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  CalendarRange,
  Users,
  UserSearch,
  Clock,
  FileText,
  BarChart3,
  Building2,
  Settings,
  Briefcase,
  Plug,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { UserRole } from "@/lib/types/database"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Timeline", href: "/timeline", icon: CalendarRange },
  { name: "Staffing", href: "/staffing", icon: UserSearch },
  { name: "Timesheets", href: "/timesheets", icon: Clock },
  { name: "Invoices", href: "/invoices", icon: FileText },
  { name: "People", href: "/people", icon: Users },
  { name: "Clients", href: "/clients", icon: Building2 },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Integrations", href: "/integrations", icon: Plug },
  { name: "Roles", href: "/settings/roles", icon: Briefcase },
  { name: "Settings", href: "/settings", icon: Settings },
]

const CONSULTANT_ALLOWED_ITEMS = new Set([
  "Dashboard",
  "Timeline",
  "Timesheets",
  "People",
])

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRole() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single()
          if (profile) {
            setRole(profile.role as UserRole)
          }
        }
      } catch {
        // If fetch fails, show all items as fallback
      } finally {
        setLoading(false)
      }
    }
    fetchRole()
  }, [])

  const filteredNavigation = role === "consultant"
    ? navigation.filter((item) => CONSULTANT_ALLOWED_ITEMS.has(item.name))
    : navigation

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar-background transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              OI
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground">
              OverIT Planner
            </span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-md p-1.5 text-sidebar-foreground hover:bg-sidebar-accent"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-4">
        {(loading ? navigation : filteredNavigation).map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href)

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                loading && "opacity-50 pointer-events-none",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
