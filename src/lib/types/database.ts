export type ProjectStatus = "tentative" | "confirmed" | "in_progress" | "completed" | "archived"
export type AllocationStatus = "tentative" | "confirmed"
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled"
export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected"
export type UserRole = "admin" | "manager" | "consultant"

export interface Organization {
  id: string
  name: string
  logo_url: string | null
  default_currency: string
  fiscal_year_start: number
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  organization_id: string | null
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  job_title: string | null
  department: string | null
  seniority_level: string | null
  cost_rate_hourly: number | null
  default_bill_rate: number | null
  location: string | null
  country_code: string | null
  weekly_capacity_hours: number
  is_active: boolean
  start_date: string | null
  created_at: string
  updated_at: string
}

export interface Skill {
  id: string
  organization_id: string | null
  name: string
  category: string | null
  created_at: string
}

export interface ProfileSkill {
  profile_id: string
  skill_id: string
  proficiency_level: number
}

export interface Client {
  id: string
  organization_id: string | null
  name: string
  contact_name: string | null
  contact_email: string | null
  billing_address: string | null
  tax_id: string | null
  default_currency: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  organization_id: string | null
  client_id: string | null
  name: string
  description: string | null
  status: ProjectStatus
  is_billable: boolean
  start_date: string | null
  end_date: string | null
  budget_hours: number | null
  budget_amount: number | null
  currency: string
  owner_id: string | null
  secondary_owner_id: string | null
  color: string
  created_at: string
  updated_at: string
  // Joined fields
  client?: Client
  owner?: Profile
}

export interface ProjectPhase {
  id: string
  project_id: string
  name: string
  start_date: string | null
  end_date: string | null
  budget_hours: number | null
  budget_amount: number | null
  sort_order: number
  created_at: string
}

export interface ProjectRole {
  id: string
  project_id: string
  phase_id: string | null
  title: string
  required_skills: string[]
  bill_rate: number | null
  estimated_hours: number | null
  start_date: string | null
  end_date: string | null
  fte: number
  is_filled: boolean
  assigned_profile_id: string | null
  created_at: string
  // Joined fields
  assigned_profile?: Profile
}

export interface Allocation {
  id: string
  organization_id: string | null
  project_id: string
  profile_id: string
  project_role_id: string | null
  start_date: string
  end_date: string
  hours_per_day: number
  bill_rate: number | null
  status: AllocationStatus
  notes: string | null
  created_at: string
  updated_at: string
  // Joined fields
  project?: Project
  profile?: Profile
}

export interface Absence {
  id: string
  profile_id: string
  start_date: string
  end_date: string
  type: string
  description: string | null
  is_approved: boolean
  created_at: string
}

export interface PublicHoliday {
  id: string
  organization_id: string | null
  country_code: string
  date: string
  name: string
}

export interface TimeEntry {
  id: string
  organization_id: string | null
  profile_id: string
  project_id: string | null
  phase_id: string | null
  date: string
  hours: number
  description: string | null
  is_billable: boolean
  created_at: string
  updated_at: string
  // Joined fields
  project?: Project
}

export interface TimesheetPeriod {
  id: string
  profile_id: string
  week_start: string
  status: TimesheetStatus
  submitted_at: string | null
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
}

export interface Invoice {
  id: string
  organization_id: string | null
  client_id: string | null
  invoice_number: string
  status: InvoiceStatus
  issue_date: string | null
  due_date: string | null
  currency: string
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes: string | null
  payment_terms: string | null
  pdf_url: string | null
  sent_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
  // Joined fields
  client?: Client
}

export interface InvoiceLineItem {
  id: string
  invoice_id: string
  project_id: string | null
  description: string
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
  // Joined fields
  project?: Project
}

export interface RoleDefinition {
  id: string
  organization_id: string | null
  name: string
  default_bill_rate: number | null
  description: string | null
  created_at: string
  updated_at: string
}

export type InviteStatus = "pending" | "accepted" | "expired" | "cancelled"

export interface PendingInvite {
  id: string
  organization_id: string
  email: string
  role: UserRole
  invited_by: string | null
  invited_at: string
  status: InviteStatus
  accepted_at: string | null
  created_at: string
}
