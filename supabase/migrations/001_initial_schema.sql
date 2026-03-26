-- OverIT Planner - Initial Database Schema
-- Applied to Supabase project: xiqaytsbbzotuixsztcd (OverIT Planner)

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE project_status AS ENUM ('tentative', 'confirmed', 'in_progress', 'completed', 'archived');
CREATE TYPE allocation_status AS ENUM ('tentative', 'confirmed');
CREATE TYPE invoice_status AS ENUM ('draft', 'sent', 'paid', 'overdue', 'cancelled');
CREATE TYPE timesheet_status AS ENUM ('draft', 'submitted', 'approved', 'rejected');
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'consultant');

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. Organizations
CREATE TABLE organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  logo_url    text,
  default_currency text DEFAULT 'EUR',
  fiscal_year_start integer DEFAULT 1,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. Profiles
CREATE TABLE profiles (
  id                    uuid PRIMARY KEY,
  organization_id       uuid REFERENCES organizations(id),
  email                 text NOT NULL,
  full_name             text NOT NULL,
  avatar_url            text,
  role                  user_role DEFAULT 'consultant',
  job_title             text,
  department            text,
  seniority_level       text,
  cost_rate_hourly      numeric,
  default_bill_rate     numeric,
  location              text,
  country_code          text,
  weekly_capacity_hours numeric DEFAULT 40,
  is_active             boolean DEFAULT true,
  start_date            date,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),

  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 3. Skills
CREATE TABLE skills (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  name            text NOT NULL,
  category        text,
  created_at      timestamptz DEFAULT now()
);

-- 4. Profile Skills (junction table)
CREATE TABLE profile_skills (
  profile_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  skill_id          uuid NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  proficiency_level integer DEFAULT 3,
  PRIMARY KEY (profile_id, skill_id)
);

-- 5. Clients
CREATE TABLE clients (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid REFERENCES organizations(id),
  name             text NOT NULL,
  contact_name     text,
  contact_email    text,
  billing_address  text,
  tax_id           text,
  default_currency text DEFAULT 'EUR',
  notes            text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- 6. Projects
CREATE TABLE projects (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid REFERENCES organizations(id),
  client_id          uuid REFERENCES clients(id),
  name               text NOT NULL,
  description        text,
  status             project_status DEFAULT 'tentative',
  is_billable        boolean DEFAULT true,
  start_date         date,
  end_date           date,
  budget_hours       numeric,
  budget_amount      numeric,
  currency           text DEFAULT 'EUR',
  owner_id           uuid REFERENCES profiles(id),
  secondary_owner_id uuid REFERENCES profiles(id),
  color              text DEFAULT '#3B82F6',
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- 7. Project Phases
CREATE TABLE project_phases (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid REFERENCES projects(id) ON DELETE CASCADE,
  name          text NOT NULL,
  start_date    date,
  end_date      date,
  budget_hours  numeric,
  budget_amount numeric,
  sort_order    integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- 8. Project Roles
CREATE TABLE project_roles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          uuid REFERENCES projects(id) ON DELETE CASCADE,
  phase_id            uuid REFERENCES project_phases(id),
  title               text NOT NULL,
  required_skills     uuid[],
  bill_rate           numeric,
  estimated_hours     numeric,
  is_filled           boolean DEFAULT false,
  assigned_profile_id uuid REFERENCES profiles(id),
  created_at          timestamptz DEFAULT now()
);

-- 9. Allocations
CREATE TABLE allocations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
  profile_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  project_role_id uuid REFERENCES project_roles(id),
  start_date      date NOT NULL,
  end_date        date NOT NULL,
  hours_per_day   numeric DEFAULT 8,
  bill_rate       numeric,
  status          allocation_status DEFAULT 'confirmed',
  notes           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 10. Absences
CREATE TABLE absences (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid REFERENCES profiles(id) ON DELETE CASCADE,
  start_date  date NOT NULL,
  end_date    date NOT NULL,
  type        text DEFAULT 'vacation',
  description text,
  is_approved boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- 11. Public Holidays
CREATE TABLE public_holidays (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  country_code    text NOT NULL,
  date            date NOT NULL,
  name            text NOT NULL,

  UNIQUE (organization_id, country_code, date)
);

-- 12. Time Entries
CREATE TABLE time_entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  profile_id      uuid REFERENCES profiles(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES projects(id),
  phase_id        uuid REFERENCES project_phases(id),
  date            date NOT NULL,
  hours           numeric NOT NULL,
  description     text,
  is_billable     boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 13. Timesheet Periods
CREATE TABLE timesheet_periods (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  week_start       date NOT NULL,
  status           timesheet_status DEFAULT 'draft',
  submitted_at     timestamptz,
  approved_by      uuid REFERENCES profiles(id),
  approved_at      timestamptz,
  rejection_reason text,
  created_at       timestamptz DEFAULT now()
);

-- 14. Invoices
CREATE TABLE invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id),
  client_id       uuid REFERENCES clients(id),
  invoice_number  text NOT NULL,
  status          invoice_status DEFAULT 'draft',
  issue_date      date,
  due_date        date,
  currency        text DEFAULT 'EUR',
  subtotal        numeric DEFAULT 0,
  tax_rate        numeric DEFAULT 0,
  tax_amount      numeric DEFAULT 0,
  total           numeric DEFAULT 0,
  notes           text,
  payment_terms   text,
  pdf_url         text,
  sent_at         timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- 15. Invoice Line Items
CREATE TABLE invoice_line_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid REFERENCES invoices(id) ON DELETE CASCADE,
  project_id  uuid REFERENCES projects(id),
  description text NOT NULL,
  quantity    numeric NOT NULL,
  unit_price  numeric NOT NULL,
  amount      numeric NOT NULL,
  sort_order  integer DEFAULT 0
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_projects_org    ON projects (organization_id);
CREATE INDEX idx_projects_status ON projects (status);

CREATE INDEX idx_allocations_project ON allocations (project_id);
CREATE INDEX idx_allocations_profile ON allocations (profile_id);
CREATE INDEX idx_allocations_dates   ON allocations (start_date, end_date);

CREATE INDEX idx_time_entries_profile ON time_entries (profile_id);
CREATE INDEX idx_time_entries_date    ON time_entries (date);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE organizations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills            ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills    ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases    ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE allocations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_holidays   ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheet_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Organizations
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (id = get_user_org_id());

CREATE POLICY "Admins can update own organization"
  ON organizations FOR UPDATE
  USING (
    id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Profiles
CREATE POLICY "Users can view org profiles"
  ON profiles FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can update org profiles"
  ON profiles FOR UPDATE
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Skills
CREATE POLICY "Users can view org skills"
  ON skills FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Admins can manage org skills"
  ON skills FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- Profile Skills
CREATE POLICY "Users can view org profile skills"
  ON profile_skills FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = profile_skills.profile_id
        AND profiles.organization_id = get_user_org_id()
    )
  );

CREATE POLICY "Users can manage own skills"
  ON profile_skills FOR ALL
  USING (profile_id = auth.uid());

-- Clients
CREATE POLICY "Users can view org clients"
  ON clients FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Managers can manage org clients"
  ON clients FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- Projects
CREATE POLICY "Users can view org projects"
  ON projects FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Managers can manage org projects"
  ON projects FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- Project Phases
CREATE POLICY "Users can view org project phases"
  ON project_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_phases.project_id
        AND projects.organization_id = get_user_org_id()
    )
  );

CREATE POLICY "Managers can manage project phases"
  ON project_phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_phases.project_id
        AND projects.organization_id = get_user_org_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- Project Roles
CREATE POLICY "Users can view org project roles"
  ON project_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_roles.project_id
        AND projects.organization_id = get_user_org_id()
    )
  );

CREATE POLICY "Managers can manage project roles"
  ON project_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_roles.project_id
        AND projects.organization_id = get_user_org_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- Allocations
CREATE POLICY "Users can view org allocations"
  ON allocations FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Managers can manage org allocations"
  ON allocations FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- Absences
CREATE POLICY "Users can view org absences"
  ON absences FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = absences.profile_id
        AND profiles.organization_id = get_user_org_id()
    )
  );

CREATE POLICY "Users can manage own absences"
  ON absences FOR ALL
  USING (profile_id = auth.uid());

-- Public Holidays
CREATE POLICY "Users can view org holidays"
  ON public_holidays FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Admins can manage org holidays"
  ON public_holidays FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Time Entries
CREATE POLICY "Users can view org time entries"
  ON time_entries FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Users can manage own time entries"
  ON time_entries FOR ALL
  USING (
    profile_id = auth.uid()
    AND organization_id = get_user_org_id()
  );

-- Timesheet Periods
CREATE POLICY "Users can view org timesheets"
  ON timesheet_periods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = timesheet_periods.profile_id
        AND profiles.organization_id = get_user_org_id()
    )
  );

CREATE POLICY "Users can manage own timesheets"
  ON timesheet_periods FOR ALL
  USING (profile_id = auth.uid());

-- Invoices
CREATE POLICY "Users can view org invoices"
  ON invoices FOR SELECT
  USING (organization_id = get_user_org_id());

CREATE POLICY "Managers can manage org invoices"
  ON invoices FOR ALL
  USING (
    organization_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- Invoice Line Items
CREATE POLICY "Users can view org invoice items"
  ON invoice_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
        AND invoices.organization_id = get_user_org_id()
    )
  );

CREATE POLICY "Managers can manage invoice items"
  ON invoice_line_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_line_items.invoice_id
        AND invoices.organization_id = get_user_org_id()
    )
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
  );

-- ============================================================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE allocations;
ALTER PUBLICATION supabase_realtime ADD TABLE time_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
