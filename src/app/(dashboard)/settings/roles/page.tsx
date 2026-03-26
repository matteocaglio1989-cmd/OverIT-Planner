import { getRoleDefinitions } from "@/lib/actions/role-definitions"
import { RolesManager } from "@/components/settings/roles-manager"

export default async function RolesPage() {
  const roleDefinitions = await getRoleDefinitions()

  return <RolesManager roleDefinitions={roleDefinitions} />
}
