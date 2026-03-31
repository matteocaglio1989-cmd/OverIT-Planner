"use client"

import { useState, useEffect } from "react"
import { Bell, LogOut, User, Settings } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

interface UserInfo {
  id: string
  email: string
  fullName: string
  role: string
  jobTitle: string | null
}

export function Header() {
  const router = useRouter()
  const supabase = createClient()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  useEffect(() => {
    async function loadUser() {
      if (!supabase) return
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, job_title")
        .eq("id", user.id)
        .single()

      if (profile) {
        setUserInfo({
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          role: profile.role,
          jobTitle: profile.job_title,
        })
      }
    }
    loadUser()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const initials = userInfo?.fullName
    ? userInfo.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div />
      <div className="flex items-center gap-2">
        <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <Bell className="h-5 w-5" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <button className="flex items-center gap-2 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                {initials}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {userInfo && (
              <>
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{userInfo.fullName}</p>
                  <p className="text-xs text-muted-foreground">{userInfo.email}</p>
                  {userInfo.jobTitle && (
                    <p className="text-xs text-muted-foreground mt-0.5">{userInfo.jobTitle}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5 capitalize">{userInfo.role}</p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem>
              <Link href={userInfo ? `/people/${userInfo.id}` : "/people"} className="flex items-center gap-2 w-full">
                <User className="h-4 w-4" />
                My Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Link href="/settings" className="flex items-center gap-2 w-full">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <button onClick={handleLogout} className="flex items-center gap-2 w-full text-destructive">
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
