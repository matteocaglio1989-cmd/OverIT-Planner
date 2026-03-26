"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type {
  Project,
  ProjectPhase,
  ProjectRole,
  ProjectStatus,
} from "@/lib/types/database"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getOrgId() {
  const supabase = await createClient()
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error("Not authenticated")

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.user.id)
    .single()

  if (!profile?.organization_id) throw new Error("No organization found")

  return { supabase, organizationId: profile.organization_id }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export async function getProjects() {
  const { supabase, organizationId } = await getOrgId()

  const { data: projects, error } = await supabase
    .from("projects")
    .select("*, client:clients(*), owner:profiles!projects_owner_id_fkey(*)")
    .eq("organization_id", organizationId)
    .order("name")

  if (error) throw error

  return (projects ?? []) as (Project & {
    client: Project["client"]
    owner: Project["owner"]
  })[]
}

export async function getProject(id: string) {
  const supabase = await createClient()

  const { data: project, error } = await supabase
    .from("projects")
    .select("*, client:clients(*), owner:profiles!projects_owner_id_fkey(*)")
    .eq("id", id)
    .single()

  if (error || !project) return null

  const { data: phases } = await supabase
    .from("project_phases")
    .select("*")
    .eq("project_id", id)
    .order("sort_order")

  const { data: roles } = await supabase
    .from("project_roles")
    .select("*, assigned_profile:profiles(*)")
    .eq("project_id", id)
    .order("title")

  const { data: timeEntries } = await supabase
    .from("time_entries")
    .select("*")
    .eq("project_id", id)

  const { data: allocations } = await supabase
    .from("allocations")
    .select("*, profile:profiles(*)")
    .eq("project_id", id)

  return {
    ...project,
    phases: (phases ?? []) as ProjectPhase[],
    roles: (roles ?? []) as (ProjectRole & {
      assigned_profile: ProjectRole["assigned_profile"]
    })[],
    time_entries: timeEntries ?? [],
    allocations: allocations ?? [],
  }
}

export async function createProject(data: {
  name: string
  description?: string | null
  client_id?: string | null
  status?: ProjectStatus
  is_billable?: boolean
  start_date?: string | null
  end_date?: string | null
  budget_hours?: number | null
  budget_amount?: number | null
  currency?: string
  owner_id?: string | null
  color?: string
}) {
  const { supabase, organizationId } = await getOrgId()

  const { error } = await supabase.from("projects").insert({
    organization_id: organizationId,
    name: data.name,
    description: data.description || null,
    client_id: data.client_id || null,
    status: data.status || "tentative",
    is_billable: data.is_billable ?? true,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    budget_hours: data.budget_hours ?? null,
    budget_amount: data.budget_amount ?? null,
    currency: data.currency || "USD",
    owner_id: data.owner_id || null,
    color: data.color || "#6366f1",
  })

  if (error) throw error

  revalidatePath("/projects")
}

export async function updateProject(
  id: string,
  data: Partial<
    Pick<
      Project,
      | "name"
      | "description"
      | "client_id"
      | "status"
      | "is_billable"
      | "start_date"
      | "end_date"
      | "budget_hours"
      | "budget_amount"
      | "currency"
      | "owner_id"
      | "color"
    >
  >
) {
  const supabase = await createClient()

  const { error } = await supabase.from("projects").update(data).eq("id", id)

  if (error) throw error

  revalidatePath("/projects")
  revalidatePath(`/projects/${id}`)
}

export async function deleteProject(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("projects")
    .update({ status: "archived" as ProjectStatus })
    .eq("id", id)

  if (error) throw error

  revalidatePath("/projects")
}

// ---------------------------------------------------------------------------
// Phases
// ---------------------------------------------------------------------------

export async function createPhase(
  projectId: string,
  data: {
    name: string
    start_date?: string | null
    end_date?: string | null
    budget_hours?: number | null
    budget_amount?: number | null
    sort_order?: number
  }
) {
  const supabase = await createClient()

  const { error } = await supabase.from("project_phases").insert({
    project_id: projectId,
    name: data.name,
    start_date: data.start_date || null,
    end_date: data.end_date || null,
    budget_hours: data.budget_hours ?? null,
    budget_amount: data.budget_amount ?? null,
    sort_order: data.sort_order ?? 0,
  })

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
}

export async function updatePhase(
  id: string,
  data: Partial<
    Pick<
      ProjectPhase,
      "name" | "start_date" | "end_date" | "budget_hours" | "budget_amount" | "sort_order"
    >
  >
) {
  const supabase = await createClient()

  const { data: phase } = await supabase
    .from("project_phases")
    .select("project_id")
    .eq("id", id)
    .single()

  const { error } = await supabase
    .from("project_phases")
    .update(data)
    .eq("id", id)

  if (error) throw error

  if (phase) revalidatePath(`/projects/${phase.project_id}`)
}

export async function deletePhase(id: string) {
  const supabase = await createClient()

  const { data: phase } = await supabase
    .from("project_phases")
    .select("project_id")
    .eq("id", id)
    .single()

  const { error } = await supabase
    .from("project_phases")
    .delete()
    .eq("id", id)

  if (error) throw error

  if (phase) revalidatePath(`/projects/${phase.project_id}`)
}

// ---------------------------------------------------------------------------
// Project Roles
// ---------------------------------------------------------------------------

export async function createProjectRole(
  projectId: string,
  data: {
    title: string
    phase_id?: string | null
    required_skills?: string[]
    bill_rate?: number | null
    estimated_hours?: number | null
    is_filled?: boolean
    assigned_profile_id?: string | null
  }
) {
  const supabase = await createClient()

  const { error } = await supabase.from("project_roles").insert({
    project_id: projectId,
    title: data.title,
    phase_id: data.phase_id || null,
    required_skills: data.required_skills ?? [],
    bill_rate: data.bill_rate ?? null,
    estimated_hours: data.estimated_hours ?? null,
    is_filled: data.is_filled ?? false,
    assigned_profile_id: data.assigned_profile_id || null,
  })

  if (error) throw error

  revalidatePath(`/projects/${projectId}`)
}

export async function updateProjectRole(
  id: string,
  data: Partial<
    Pick<
      ProjectRole,
      | "title"
      | "phase_id"
      | "required_skills"
      | "bill_rate"
      | "estimated_hours"
      | "is_filled"
      | "assigned_profile_id"
    >
  >
) {
  const supabase = await createClient()

  const { data: role } = await supabase
    .from("project_roles")
    .select("project_id")
    .eq("id", id)
    .single()

  const { error } = await supabase
    .from("project_roles")
    .update(data)
    .eq("id", id)

  if (error) throw error

  if (role) revalidatePath(`/projects/${role.project_id}`)
}

export async function deleteProjectRole(id: string) {
  const supabase = await createClient()

  const { data: role } = await supabase
    .from("project_roles")
    .select("project_id")
    .eq("id", id)
    .single()

  const { error } = await supabase
    .from("project_roles")
    .delete()
    .eq("id", id)

  if (error) throw error

  if (role) revalidatePath(`/projects/${role.project_id}`)
}
