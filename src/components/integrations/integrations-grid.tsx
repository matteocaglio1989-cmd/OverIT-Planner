"use client"

import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface Integration {
  id: string
  name: string
  description: string
  icon: string
  href: string
  status: "available" | "connected" | "coming_soon"
  category: string
}

const integrations: Integration[] = [
  {
    id: "hibob",
    name: "HiBob",
    description: "Sync people, org structure, and time-off from HiBob HRIS.",
    icon: "🟣",
    href: "/integrations/hibob",
    status: "available",
    category: "HRIS",
  },
  {
    id: "jira",
    name: "Jira",
    description: "Link projects and track issues from Atlassian Jira.",
    icon: "🔵",
    href: "/integrations",
    status: "coming_soon",
    category: "Project Management",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Send notifications and updates to Slack channels.",
    icon: "💬",
    href: "/integrations",
    status: "coming_soon",
    category: "Communication",
  },
  {
    id: "quickbooks",
    name: "QuickBooks",
    description: "Sync invoices and financial data with QuickBooks.",
    icon: "💰",
    href: "/integrations",
    status: "coming_soon",
    category: "Accounting",
  },
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync absences and project milestones with Google Calendar.",
    icon: "📅",
    href: "/integrations",
    status: "coming_soon",
    category: "Calendar",
  },
  {
    id: "xero",
    name: "Xero",
    description: "Export invoices and expenses to Xero accounting.",
    icon: "📊",
    href: "/integrations",
    status: "coming_soon",
    category: "Accounting",
  },
]

const statusConfig = {
  available: { label: "Available", className: "bg-green-100 text-green-800 border-green-200" },
  connected: { label: "Connected", className: "bg-blue-100 text-blue-800 border-blue-200" },
  coming_soon: { label: "Coming Soon", className: "bg-gray-100 text-gray-500 border-gray-200" },
}

export function IntegrationsGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {integrations.map((integration) => {
        const status = statusConfig[integration.status]
        const isClickable = integration.status !== "coming_soon"

        const content = (
          <Card
            className={`relative overflow-hidden transition-all ${
              isClickable
                ? "hover:shadow-md hover:border-primary/30 cursor-pointer"
                : "opacity-70"
            }`}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-2xl">
                  {integration.icon}
                </div>
                <Badge className={`border text-xs ${status.className}`}>
                  {status.label}
                </Badge>
              </div>
              <h3 className="font-semibold text-lg mb-1">{integration.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {integration.description}
              </p>
              <div className="mt-3">
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {integration.category}
                </span>
              </div>
            </CardContent>
          </Card>
        )

        if (isClickable) {
          return (
            <Link key={integration.id} href={integration.href}>
              {content}
            </Link>
          )
        }

        return <div key={integration.id}>{content}</div>
      })}
    </div>
  )
}
