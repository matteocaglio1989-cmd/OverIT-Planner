"use server"

import { createClient } from "@/lib/supabase/server"
import { format, startOfMonth, endOfMonth, startOfQuarter, subMonths } from "date-fns"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getAuthInfo() {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.user.id)
    .single()

  if (!profile?.organization_id) throw new Error("No organization found")

  return { supabase, userId: user.user.id, organizationId: profile.organization_id }
}

// ---------------------------------------------------------------------------
// Dashboard KPIs
// ---------------------------------------------------------------------------

export async function getDashboardKPIs() {
  const { supabase, organizationId } = await getAuthInfo()

  const now = new Date()
  const monthStart = format(startOfMonth(now), "yyyy-MM-dd")
  const monthEnd = format(endOfMonth(now), "yyyy-MM-dd")
  const quarterStart = format(startOfQuarter(now), "yyyy-MM-dd")
  const prevMonthStart = format(startOfMonth(subMonths(now, 1)), "yyyy-MM-dd")
  const prevMonthEnd = format(endOfMonth(subMonths(now, 1)), "yyyy-MM-dd")

  // Active profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, weekly_capacity_hours")
    .eq("organization_id", organizationId)
    .eq("is_active", true)

  const profileIds = (profiles ?? []).map((p) => p.id)
  const totalWeeklyCapacity = (profiles ?? []).reduce(
    (sum, p) => sum + p.weekly_capacity_hours,
    0
  )

  // This month's time entries for utilization
  const { data: monthEntries } = await supabase
    .from("time_entries")
    .select("hours, is_billable")
    .in("profile_id", profileIds.length > 0 ? profileIds : ["__none__"])
    .gte("date", monthStart)
    .lte("date", monthEnd)

  const totalHoursThisMonth = (monthEntries ?? []).reduce(
    (sum, e) => sum + e.hours,
    0
  )
  const billableHoursThisMonth = (monthEntries ?? []).reduce(
    (sum, e) => sum + (e.is_billable ? e.hours : 0),
    0
  )

  // Approximate monthly capacity (4.33 weeks per month)
  const monthlyCapacity = totalWeeklyCapacity * 4.33
  const utilizationRate =
    monthlyCapacity > 0
      ? Math.round((billableHoursThisMonth / monthlyCapacity) * 100)
      : 0

  // Revenue MTD (from paid invoices this month)
  const { data: mtdInvoices } = await supabase
    .from("invoices")
    .select("total")
    .eq("organization_id", organizationId)
    .in("status", ["paid", "sent"])
    .gte("issue_date", monthStart)
    .lte("issue_date", monthEnd)

  const revenueMtd = (mtdInvoices ?? []).reduce((sum, inv) => sum + inv.total, 0)

  // Revenue QTD
  const { data: qtdInvoices } = await supabase
    .from("invoices")
    .select("total")
    .eq("organization_id", organizationId)
    .in("status", ["paid", "sent"])
    .gte("issue_date", quarterStart)
    .lte("issue_date", monthEnd)

  const revenueQtd = (qtdInvoices ?? []).reduce((sum, inv) => sum + inv.total, 0)

  // Previous month revenue for comparison
  const { data: prevInvoices } = await supabase
    .from("invoices")
    .select("total")
    .eq("organization_id", organizationId)
    .in("status", ["paid", "sent"])
    .gte("issue_date", prevMonthStart)
    .lte("issue_date", prevMonthEnd)

  const revenuePrevMonth = (prevInvoices ?? []).reduce(
    (sum, inv) => sum + inv.total,
    0
  )
  const revenueChange =
    revenuePrevMonth > 0
      ? Math.round(((revenueMtd - revenuePrevMonth) / revenuePrevMonth) * 100)
      : 0

  // Bench count: active profiles without allocations this month
  const { data: currentAllocations } = await supabase
    .from("allocations")
    .select("profile_id")
    .eq("organization_id", organizationId)
    .lte("start_date", monthEnd)
    .gte("end_date", monthStart)

  const allocatedIds = new Set(
    (currentAllocations ?? []).map((a) => a.profile_id)
  )
  const benchCount = profileIds.filter((id) => !allocatedIds.has(id)).length

  // Active projects
  const { data: activeProjects } = await supabase
    .from("projects")
    .select("id")
    .eq("organization_id", organizationId)
    .in("status", ["confirmed", "in_progress"])

  const activeProjectCount = activeProjects?.length ?? 0

  // Average delivery margin
  const { data: billableProjects } = await supabase
    .from("projects")
    .select("id, budget_amount")
    .eq("organization_id", organizationId)
    .eq("is_billable", true)
    .in("status", ["confirmed", "in_progress", "completed"])

  let totalRevenue = 0
  let totalCost = 0

  for (const proj of billableProjects ?? []) {
    totalRevenue += proj.budget_amount ?? 0

    const { data: projEntries } = await supabase
      .from("time_entries")
      .select("hours, profile:profiles(cost_rate_hourly)")
      .eq("project_id", proj.id)

    for (const entry of projEntries ?? []) {
      const profileData = entry.profile as unknown as { cost_rate_hourly: number | null } | null
      const costRate = profileData?.cost_rate_hourly ?? 0
      totalCost += entry.hours * costRate
    }
  }

  const avgDeliveryMargin =
    totalRevenue > 0
      ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100)
      : 0

  return {
    utilization_rate: utilizationRate,
    revenue_mtd: revenueMtd,
    revenue_qtd: revenueQtd,
    revenue_change: revenueChange,
    bench_count: benchCount,
    active_projects: activeProjectCount,
    avg_delivery_margin: avgDeliveryMargin,
    total_people: profileIds.length,
  }
}

// ---------------------------------------------------------------------------
// Utilization Data
// ---------------------------------------------------------------------------

export interface UtilizationRow {
  profile_id: string
  name: string
  capacity_hours: number
  actual_hours: number
  billable_hours: number
  utilization_pct: number
}

export async function getUtilizationData(
  period: "month" | "quarter" = "month"
): Promise<UtilizationRow[]> {
  const { supabase, organizationId } = await getAuthInfo()

  const now = new Date()
  const periodStart =
    period === "quarter"
      ? format(startOfQuarter(now), "yyyy-MM-dd")
      : format(startOfMonth(now), "yyyy-MM-dd")
  const periodEnd = format(endOfMonth(now), "yyyy-MM-dd")

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, weekly_capacity_hours")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("full_name")

  if (!profiles || profiles.length === 0) return []

  const weeksInPeriod = period === "quarter" ? 13 : 4.33

  const result: UtilizationRow[] = []

  for (const profile of profiles) {
    const { data: entries } = await supabase
      .from("time_entries")
      .select("hours, is_billable")
      .eq("profile_id", profile.id)
      .gte("date", periodStart)
      .lte("date", periodEnd)

    const actualHours = (entries ?? []).reduce((sum, e) => sum + e.hours, 0)
    const billableHours = (entries ?? []).reduce(
      (sum, e) => sum + (e.is_billable ? e.hours : 0),
      0
    )
    const capacity = profile.weekly_capacity_hours * weeksInPeriod

    result.push({
      profile_id: profile.id,
      name: profile.full_name,
      capacity_hours: Math.round(capacity),
      actual_hours: Math.round(actualHours * 10) / 10,
      billable_hours: Math.round(billableHours * 10) / 10,
      utilization_pct:
        capacity > 0 ? Math.round((billableHours / capacity) * 100) : 0,
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// Revenue Data
// ---------------------------------------------------------------------------

export interface RevenueRow {
  month: string
  confirmed: number
  tentative: number
  total: number
}

export async function getRevenueData(
  period: "6m" | "12m" = "6m"
): Promise<RevenueRow[]> {
  const { supabase, organizationId } = await getAuthInfo()

  const months = period === "12m" ? 12 : 6
  const result: RevenueRow[] = []

  for (let i = 0; i < months; i++) {
    const date = i === 0 ? new Date() : subMonths(new Date(), -i)
    // Go forward from current month
    const targetDate = new Date()
    targetDate.setMonth(targetDate.getMonth() + i)

    const mStart = format(startOfMonth(targetDate), "yyyy-MM-dd")
    const mEnd = format(endOfMonth(targetDate), "yyyy-MM-dd")
    const label = format(targetDate, "MMM yyyy")

    // Confirmed revenue: allocations with confirmed status
    const { data: confirmedAllocs } = await supabase
      .from("allocations")
      .select("hours_per_day, start_date, end_date, bill_rate")
      .eq("organization_id", organizationId)
      .eq("status", "confirmed")
      .lte("start_date", mEnd)
      .gte("end_date", mStart)

    let confirmed = 0
    for (const alloc of confirmedAllocs ?? []) {
      const allocStart = new Date(
        Math.max(new Date(alloc.start_date).getTime(), new Date(mStart).getTime())
      )
      const allocEnd = new Date(
        Math.min(new Date(alloc.end_date).getTime(), new Date(mEnd).getTime())
      )
      // Approximate working days
      const days = Math.max(0, Math.ceil((allocEnd.getTime() - allocStart.getTime()) / (1000 * 60 * 60 * 24)) * 5 / 7)
      confirmed += days * alloc.hours_per_day * (alloc.bill_rate ?? 0)
    }

    // Tentative revenue
    const { data: tentativeAllocs } = await supabase
      .from("allocations")
      .select("hours_per_day, start_date, end_date, bill_rate")
      .eq("organization_id", organizationId)
      .eq("status", "tentative")
      .lte("start_date", mEnd)
      .gte("end_date", mStart)

    let tentative = 0
    for (const alloc of tentativeAllocs ?? []) {
      const allocStart = new Date(
        Math.max(new Date(alloc.start_date).getTime(), new Date(mStart).getTime())
      )
      const allocEnd = new Date(
        Math.min(new Date(alloc.end_date).getTime(), new Date(mEnd).getTime())
      )
      const days = Math.max(0, Math.ceil((allocEnd.getTime() - allocStart.getTime()) / (1000 * 60 * 60 * 24)) * 5 / 7)
      tentative += days * alloc.hours_per_day * (alloc.bill_rate ?? 0)
    }

    result.push({
      month: label,
      confirmed: Math.round(confirmed),
      tentative: Math.round(tentative),
      total: Math.round(confirmed + tentative),
    })
  }

  return result
}

// ---------------------------------------------------------------------------
// Profitability Data
// ---------------------------------------------------------------------------

export interface ProfitabilityRow {
  project_id: string
  project_name: string
  client_name: string
  revenue: number
  costs: number
  margin_amount: number
  margin_pct: number
}

export async function getProfitabilityData(): Promise<ProfitabilityRow[]> {
  const { supabase, organizationId } = await getAuthInfo()

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, budget_amount, client:clients(name)")
    .eq("organization_id", organizationId)
    .eq("is_billable", true)
    .in("status", ["confirmed", "in_progress", "completed"])
    .order("name")

  if (!projects || projects.length === 0) return []

  const result: ProfitabilityRow[] = []

  for (const proj of projects) {
    const revenue = proj.budget_amount ?? 0

    const { data: entries } = await supabase
      .from("time_entries")
      .select("hours, profile:profiles(cost_rate_hourly)")
      .eq("project_id", proj.id)

    let costs = 0
    for (const entry of entries ?? []) {
      const profileData = entry.profile as unknown as { cost_rate_hourly: number | null } | null
      const costRate = profileData?.cost_rate_hourly ?? 0
      costs += entry.hours * costRate
    }

    const marginAmount = revenue - costs
    const marginPct = revenue > 0 ? Math.round((marginAmount / revenue) * 100) : 0

    const clientData = proj.client as unknown as { name: string } | null
    const clientName = clientData?.name ?? "No client"

    result.push({
      project_id: proj.id,
      project_name: proj.name,
      client_name: clientName,
      revenue: Math.round(revenue),
      costs: Math.round(costs),
      margin_amount: Math.round(marginAmount),
      margin_pct: marginPct,
    })
  }

  // Sort by margin descending
  result.sort((a, b) => b.margin_pct - a.margin_pct)

  return result
}
