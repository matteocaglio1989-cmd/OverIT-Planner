"use client"

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { ProjectForm } from "@/components/projects/project-form"
import { ProjectPhases } from "@/components/projects/project-phases"
import { ProjectRoles } from "@/components/projects/project-roles"
import { BudgetTracker } from "@/components/projects/budget-tracker"
import type {
  Project,
  ProjectPhase,
  ProjectRole,
  Client,
  Profile,
  TimeEntry,
  Allocation,
} from "@/lib/types/database"

interface ProjectWithDetails extends Project {
  phases: ProjectPhase[]
  roles: (ProjectRole & {
    assigned_profile?: Pick<Profile, "id" | "full_name"> | null
  })[]
  time_entries: TimeEntry[]
  allocations: (Allocation & { profile?: Profile | null })[]
}

interface ProjectDetailTabsProps {
  project: ProjectWithDetails
  clients: Pick<Client, "id" | "name">[]
  profiles: Pick<Profile, "id" | "full_name">[]
}

export function ProjectDetailTabs({
  project,
  clients,
  profiles,
}: ProjectDetailTabsProps) {
  const actualHours = project.time_entries.reduce((sum, te) => sum + te.hours, 0)

  // Estimate actual cost based on allocations' bill rates or a rough calc
  const actualAmount = project.time_entries.reduce((sum, te) => {
    // Find an allocation matching this profile to get a bill rate
    const allocation = project.allocations.find(
      (a) => a.profile_id === te.profile_id
    )
    const rate = allocation?.bill_rate ?? 0
    return sum + te.hours * rate
  }, 0)

  return (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="team">Team &amp; Roles</TabsTrigger>
        <TabsTrigger value="phases">Phases</TabsTrigger>
        <TabsTrigger value="budget">Budget</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="mt-4">
          <ProjectForm
            project={project}
            clients={clients}
            profiles={profiles}
            inline
          />
        </div>
      </TabsContent>

      <TabsContent value="team">
        <div className="mt-4">
          <ProjectRoles
            projectId={project.id}
            roles={project.roles}
            profiles={profiles}
            currency={project.currency}
          />
        </div>
      </TabsContent>

      <TabsContent value="phases">
        <div className="mt-4">
          <ProjectPhases
            projectId={project.id}
            phases={project.phases}
            currency={project.currency}
          />
        </div>
      </TabsContent>

      <TabsContent value="budget">
        <div className="mt-4">
          <BudgetTracker
            budgetHours={project.budget_hours}
            budgetAmount={project.budget_amount}
            actualHours={actualHours}
            actualAmount={actualAmount}
            currency={project.currency}
          />
        </div>
      </TabsContent>
    </Tabs>
  )
}
