import { requireRole } from "@/lib/auth-guard"
import { getRoleDefinitions } from "@/lib/actions/role-definitions"
import { RolesManager } from "@/components/settings/roles-manager"

export default async function RolesPage() {
  await requireRole(["super_admin", "admin", "manager"])
  const roleDefinitions = await getRoleDefinitions()

  return <RolesManager roleDefinitions={roleDefinitions} />
}
