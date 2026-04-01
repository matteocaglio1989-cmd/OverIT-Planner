import { requireRole } from "@/lib/auth-guard"
import { getSkills } from "@/lib/actions/skills"
import { SkillsManager } from "@/components/people/skills-manager"

export default async function SkillsPage() {
  await requireRole(["admin", "manager"])
  const skills = await getSkills()

  return <SkillsManager skills={skills} />
}
