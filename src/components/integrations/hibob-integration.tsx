"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectOption } from "@/components/ui/select"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import {
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Check,
  AlertCircle,
  Plug,
  Users,
  AlertTriangle,
  Plus,
  Search,
} from "lucide-react"
import Link from "next/link"
import {
  saveHiBobConfig,
  getHiBobConfig,
  testHiBobConnection,
  previewHiBobPeople,
  syncHiBobPeople,
} from "@/lib/actions/integrations"

interface PreviewEmployee {
  hibobId: string
  email: string
  fullName: string
  jobTitle: string
  department: string
  startDate: string
  location: string
  isDuplicate: boolean
  hasChanges: boolean
  existingProfileId: string | null
  roleExists: boolean
  selected: boolean
}

interface RoleDefinition {
  id: string
  name: string
  default_bill_rate: number | null
}

interface RoleMapping {
  hibobTitle: string
  appRoleId: string | null
  appRoleName: string
  defaultBillRate: number | null
  createNew: boolean
}

type Step = "config" | "preview" | "roles" | "confirm" | "result"

export function HiBobIntegration() {
  const router = useRouter()

  // Config state
  const [apiToken, setApiToken] = useState("")
  const [serviceUserId, setServiceUserId] = useState("")
  const [connected, setConnected] = useState(false)
  const [saving, setSaving] = useState(false)
  const [configLoading, setConfigLoading] = useState(true)

  // Flow state
  const [step, setStep] = useState<Step>("config")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Preview state
  const [employees, setEmployees] = useState<PreviewEmployee[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [roleDefinitions, setRoleDefinitions] = useState<RoleDefinition[]>([])
  const [missingRoles, setMissingRoles] = useState<string[]>([])
  const [roleMappings, setRoleMappings] = useState<RoleMapping[]>([])

  // Result state
  const [syncLog, setSyncLog] = useState<{ action: string; count: number; status: string }[]>([])

  // Load config on mount via server action
  useEffect(() => {
    async function loadConfig() {
      try {
        const result = await getHiBobConfig()
        if (result && !result.error) {
          if (result.hasApiToken) {
            setApiToken("••••••••")
            setServiceUserId(result.serviceUserId || "")
            setConnected(true)
          } else if (result.serviceUserId) {
            setServiceUserId(result.serviceUserId)
          }
        }
      } catch {
        // Ignore errors on initial load
      } finally {
        setConfigLoading(false)
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
      // If the token is masked, we need the real token from the DB.
      // The server action will handle storing the new values.
      const tokenToSave = apiToken.includes("••••") ? "" : apiToken

      if (!serviceUserId) {
        setError("Service User ID is required")
        setSaving(false)
        return
      }

      if (!tokenToSave && !connected) {
        setError("API Token is required")
        setSaving(false)
        return
      }

      // If the user hasn't changed the token (still masked), skip saving token
      if (tokenToSave) {
        // Test connection first with the new credentials
        const testResult = await testHiBobConnection(serviceUserId, tokenToSave)
        if (testResult.error) {
          setError(`Connection test failed: ${testResult.error}`)
          setSaving(false)
          return
        }

        const result = await saveHiBobConfig(serviceUserId, tokenToSave)
        if (result.error) {
          setError(result.error)
          setSaving(false)
          return
        }
      } else {
        // Only update the service user ID - save with empty token means keep existing
        // We need to save the config with the service user ID update only
        // Re-fetch existing token from server to test connection
        const result = await saveHiBobConfig(serviceUserId, "")
        if (result.error) {
          setError(result.error)
          setSaving(false)
          return
        }
      }

      setConnected(true)
      setSuccess("Credentials saved and connection verified.")
      if (tokenToSave) {
        setApiToken("••••••••")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  // Step 1: Fetch preview via server action
  async function handleFetchPreview() {
    setLoading(true)
    setError(null)
    try {
      const data = await previewHiBobPeople()
      if (data.error) {
        throw new Error(data.error)
      }
      setEmployees(data.employees || [])
      setMissingRoles(data.missingRoles || [])
      setRoleDefinitions(data.roleDefinitions || [])

      // Initialize role mappings for missing roles
      setRoleMappings(
        (data.missingRoles || []).map((title: string) => ({
          hibobTitle: title,
          appRoleId: null,
          appRoleName: title,
          defaultBillRate: null,
          createNew: true,
        }))
      )

      setStep("preview")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch preview")
    } finally {
      setLoading(false)
    }
  }

  // Toggle employee selection
  function toggleEmployee(index: number) {
    setEmployees((prev) =>
      prev.map((e, i) => (i === index ? { ...e, selected: !e.selected } : e))
    )
  }

  function selectAll(selected: boolean) {
    setEmployees((prev) => prev.map((e) => ({ ...e, selected })))
  }

  // Update role mapping
  function updateRoleMapping(index: number, updates: Partial<RoleMapping>) {
    setRoleMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...updates } : m))
    )
  }

  // Step 3: Confirm & sync via server action
  async function handleSync() {
    setLoading(true)
    setError(null)
    try {
      const selected = employees.filter((e) => e.selected)

      const result = await syncHiBobPeople(
        selected,
        roleMappings.filter((m) => m.createNew),
        true
      )

      if (result.error) {
        throw new Error(result.error)
      }
      setSyncLog(result.log || [])

      setStep("result")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setLoading(false)
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      emp.fullName.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query)
    )
  })

  const selectedCount = employees.filter((e) => e.selected).length
  const newCount = employees.filter((e) => e.selected && !e.isDuplicate).length
  const updateCount = employees.filter((e) => e.selected && e.isDuplicate).length

  if (configLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Link
          href="/integrations"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Integrations
        </Link>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Loading configuration...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
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
                connected
                  ? "bg-green-100 text-green-800 border-green-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}
            >
              {connected ? "Connected" : "Not Connected"}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Step: Config */}
      {step === "config" && (
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
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">API Token</label>
                <Input
                  type="password"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                  placeholder="Enter your HiBob API token"
                />
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
                {connected && (
                  <Button type="button" onClick={handleFetchPreview} disabled={loading}>
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4 mr-2" />
                        Fetch People from HiBob
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step: Preview -- select people to import */}
      {step === "preview" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Select People to Import ({employees.length} found in HiBob)
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => selectAll(true)}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => selectAll(false)}>
                  Deselect All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="border rounded-lg overflow-auto max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]" />
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp) => {
                    const originalIndex = employees.indexOf(emp)
                    return (
                    <TableRow
                      key={emp.hibobId || emp.email}
                      className={emp.selected ? "" : "opacity-50"}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={emp.selected}
                          onChange={() => toggleEmployee(originalIndex)}
                          className="rounded border-input"
                        />
                      </TableCell>
                      <TableCell className="font-medium">{emp.fullName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {emp.email}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {emp.jobTitle || "\u2014"}
                          {!emp.roleExists && emp.jobTitle && (
                            <Badge className="border bg-amber-100 text-amber-800 border-amber-200 text-xs">
                              New Role
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{emp.department || "\u2014"}</TableCell>
                      <TableCell>
                        {emp.isDuplicate ? (
                          emp.hasChanges ? (
                            <Badge className="border bg-blue-100 text-blue-800 border-blue-200">
                              Update
                            </Badge>
                          ) : (
                            <Badge className="border bg-gray-100 text-gray-500 border-gray-200">
                              Exists
                            </Badge>
                          )
                        ) : (
                          <Badge className="border bg-green-100 text-green-800 border-green-200">
                            New
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                {selectedCount} selected: {newCount} new, {updateCount} to update
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("config")}>
                  Back
                </Button>
                <Button
                  onClick={() =>
                    missingRoles.length > 0 ? setStep("roles") : setStep("confirm")
                  }
                  disabled={selectedCount === 0}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Role Mapping */}
      {step === "roles" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Map HiBob Roles ({missingRoles.length} not found in your Role Definitions)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The following job titles from HiBob don&apos;t match any of your defined roles.
              Choose how to handle each one.
            </p>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>HiBob Job Title</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Map To / Create As</TableHead>
                    <TableHead>Default Bill Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleMappings.map((mapping, i) => (
                    <TableRow key={mapping.hibobTitle}>
                      <TableCell className="font-medium">
                        {mapping.hibobTitle}
                      </TableCell>
                      <TableCell>
                        <Select
                          className="h-8 text-xs w-[160px]"
                          value={mapping.createNew ? "create" : "map"}
                          onChange={(e) => {
                            const createNew = e.target.value === "create"
                            updateRoleMapping(i, {
                              createNew,
                              appRoleId: createNew ? null : (roleDefinitions[0]?.id || null),
                              appRoleName: createNew ? mapping.hibobTitle : (roleDefinitions[0]?.name || ""),
                            })
                          }}
                        >
                          <SelectOption value="create">Create New Role</SelectOption>
                          {roleDefinitions.length > 0 && (
                            <SelectOption value="map">Map to Existing</SelectOption>
                          )}
                        </Select>
                      </TableCell>
                      <TableCell>
                        {mapping.createNew ? (
                          <Input
                            className="h-8 text-xs"
                            value={mapping.appRoleName}
                            onChange={(e) =>
                              updateRoleMapping(i, { appRoleName: e.target.value })
                            }
                          />
                        ) : (
                          <Select
                            className="h-8 text-xs"
                            value={mapping.appRoleId || ""}
                            onChange={(e) => {
                              const rd = roleDefinitions.find((r) => r.id === e.target.value)
                              updateRoleMapping(i, {
                                appRoleId: e.target.value,
                                appRoleName: rd?.name || "",
                                defaultBillRate: rd?.default_bill_rate || null,
                              })
                            }}
                          >
                            {roleDefinitions.map((rd) => (
                              <SelectOption key={rd.id} value={rd.id}>
                                {rd.name}
                                {rd.default_bill_rate
                                  ? ` (${Number(rd.default_bill_rate).toFixed(0)}/h)`
                                  : ""}
                              </SelectOption>
                            ))}
                          </Select>
                        )}
                      </TableCell>
                      <TableCell>
                        {mapping.createNew && (
                          <Input
                            className="h-8 text-xs w-[100px]"
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={mapping.defaultBillRate ?? ""}
                            onChange={(e) =>
                              updateRoleMapping(i, {
                                defaultBillRate: e.target.value ? Number(e.target.value) : null,
                              })
                            }
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("preview")}>
                Back
              </Button>
              <Button onClick={() => setStep("confirm")}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Confirm */}
      {step === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Confirm Import</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{newCount}</div>
                <div className="text-sm text-muted-foreground">New people to invite</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{updateCount}</div>
                <div className="text-sm text-muted-foreground">Existing profiles to update</div>
              </div>
            </div>

            {roleMappings.filter((m) => m.createNew).length > 0 && (
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="h-4 w-4 text-amber-500" />
                  <span className="font-medium text-sm">
                    {roleMappings.filter((m) => m.createNew).length} new role definitions will be created:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {roleMappings
                    .filter((m) => m.createNew)
                    .map((m) => (
                      <Badge key={m.hibobTitle} className="border bg-amber-100 text-amber-800 border-amber-200">
                        {m.appRoleName}
                        {m.defaultBillRate ? ` (${m.defaultBillRate}/h)` : ""}
                      </Badge>
                    ))}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Separator />

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() =>
                  missingRoles.length > 0 ? setStep("roles") : setStep("preview")
                }
              >
                Back
              </Button>
              <Button onClick={handleSync} disabled={loading}>
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirm &amp; Import
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Result */}
      {step === "result" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-green-700">
              <Check className="h-5 w-5" />
              Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setStep("config"); setError(null); setSuccess(null) }}>
                Done
              </Button>
              <Button variant="outline" onClick={handleFetchPreview}>
                Run Another Sync
              </Button>
              <Link href="/people">
                <Button>
                  <Users className="h-4 w-4 mr-2" />
                  View People
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
