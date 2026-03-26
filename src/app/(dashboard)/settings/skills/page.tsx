import { getSkills } from "@/lib/actions/skills"
import { SkillsManager } from "@/components/people/skills-manager"

export default async function SkillsPage() {
  const skills = await getSkills()

  return <SkillsManager skills={skills} />
}
