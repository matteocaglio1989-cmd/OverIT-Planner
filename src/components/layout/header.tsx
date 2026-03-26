"use client"

import { Bell, LogOut, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function Header() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background px-6">
      <div />
      <div className="flex items-center gap-2">
        <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <Bell className="h-5 w-5" />
        </button>
        <button className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground">
          <User className="h-5 w-5" />
        </button>
        <button
          onClick={handleLogout}
          className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
