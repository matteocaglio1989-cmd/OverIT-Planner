"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { ArrowLeft, RefreshCw, Check, AlertCircle, Plug, Users } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"

interface SyncStatus {
  connected: boolean
  lastSync: string | null
  employeeCount: number | null
}

export function HiBobIntegration() {
  const router = useRouter()
  const supabase = createClient()

  const [apiToken, setApiToken] = useState("")
  const [serviceUserId, setServiceUserId] = useState("")
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    connected: false,
    lastSync: null,
    employeeCount: null,
  })
  const [syncLog, setSyncLog] = useState<
    { action: string; count: number; status: string }[]
  >([])

  // Load saved config on mount
  useEffect(() => {
    async function loadConfig() {
      if (!supabase) return
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) return

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.user.id)
        .single()

      if (!profile?.organization_id) return

      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single()

      // Check if HiBob config exists in org metadata
      // For now we store it in localStorage as a simple approach
      const saved = localStorage.getItem(`hibob_config_${profile.organization_id}`)
      if (saved) {
        const config = JSON.parse(saved)
        setApiToken(config.apiToken ? "••••••••" : "")
        setServiceUserId(config.serviceUserId || "")
        setSyncStatus({
          connected: !!config.apiToken,
          lastSync: config.lastSync || null,
          employeeCount: config.employeeCount || null,
        })
      }
    }
    loadConfig()
  }, [])

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      if (!supabase) throw new Error("Not connected")
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("Not authenticated")

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.user.id)
        .single()

      if (!profile?.organization_id) throw new Error("No organization")

      // Test connection by attempting to fetch from HiBob API
      const testResponse = await fetch("/api/integrations/hibob/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiToken: apiToken.includes("••••") ? undefined : apiToken,
          serviceUserId,
        }),
      })

      // Save config (in production, encrypt the token server-side)
      const config = {
        apiToken: apiToken.includes("••••") ? undefined : apiToken,
        serviceUserId,
        lastSync: null,
        employeeCount: null,
      }

      // For demo: save to localStorage (production: use encrypted DB field)
      const existing = localStorage.getItem(`hibob_config_${profile.organization_id}`)
      const existingConfig = existing ? JSON.parse(existing) : {}
      const merged = {
        ...existingConfig,
        ...config,
        apiToken: config.apiToken || existingConfig.apiToken,
      }
      localStorage.setItem(`hibob_config_${profile.organization_id}`, JSON.stringify(merged))

      setSyncStatus((prev) => ({ ...prev, connected: true }))
      setSuccess("HiBob credentials saved successfully. You can now sync your people.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration")
    } finally {
      setSaving(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    setSuccess(null)
    setSyncLog([])

    try {
      if (!supabase) throw new Error("Not connected")
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error("Not authenticated")

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.user.id)
        .single()

      if (!profile?.organization_id) throw new Error("No organization")

      // Call the sync API endpoint
      const response = await fetch("/api/integrations/hibob/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: profile.organization_id }),
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || "Sync failed")
      }

      const result = await response.json()

      setSyncLog(result.log || [])
      setSyncStatus((prev) => ({
        ...prev,
        lastSync: new Date().toISOString(),
        employeeCount: result.employeeCount || prev.employeeCount,
      }))

      // Update localStorage
      const saved = localStorage.getItem(`hibob_config_${profile.organization_id}`)
      if (saved) {
        const config = JSON.parse(saved)
        config.lastSync = new Date().toISOString()
        config.employeeCount = result.employeeCount
        localStorage.setItem(`hibob_config_${profile.organization_id}`, JSON.stringify(config))
      }

      setSuccess(`Sync completed! ${result.employeeCount || 0} employees processed.`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/integrations"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Integrations
      </Link>

      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-xl">
                🟣
              </div>
              <div>
                <CardTitle>HiBob</CardTitle>
                <p className="text-sm text-muted-foreground">HRIS Integration</p>
              </div>
            </div>
            <Badge
              className={`border ${
                syncStatus.connected
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}
            >
              {syncStatus.connected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {syncStatus.connected && (
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              {syncStatus.lastSync && (
                <span>
                  Last sync: {new Date(syncStatus.lastSync).toLocaleString()}
                </span>
              )}
              {syncStatus.employeeCount != null && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {syncStatus.employeeCount} employees
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="h-4 w-4" />
            API Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveConfig} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Service User ID</label>
              <Input
                value={serviceUserId}
                onChange={(e) => setServiceUserId(e.target.value)}
                placeholder="your-service-user@company.com"
              />
              <p className="text-xs text-muted-foreground">
                The email of the HiBob service user with API access.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">API Token</label>
              <Input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter your HiBob API token"
              />
              <p className="text-xs text-muted-foreground">
                Generate a token in HiBob under Settings &gt; Integrations &gt; API.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-md bg-green-50 p-3 text-sm text-green-700">
                <Check className="h-4 w-4 shrink-0" />
                {success}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Sync */}
      {syncStatus.connected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4" />
              Sync People
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sync will import employees from HiBob and create or update profiles in OverIT Planner.
              Matching is done by email address.
            </p>

            <div className="text-sm space-y-1">
              <p className="font-medium">Data synced from HiBob:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                <li>Employee name, email, job title</li>
                <li>Department and team</li>
                <li>Start date and location</li>
                <li>Time-off / absences</li>
              </ul>
            </div>

            <Separator />

            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </>
              )}
            </Button>

            {/* Sync Log */}
            {syncLog.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Sync Results</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncLog.map((entry, i) => (
                      <TableRow key={i}>
                        <TableCell>{entry.action}</TableCell>
                        <TableCell>{entry.count}</TableCell>
                        <TableCell>
                          <Badge
                            className={`border ${
                              entry.status === "success"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : "bg-red-100 text-red-800 border-red-200"
                            }`}
                          >
                            {entry.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
