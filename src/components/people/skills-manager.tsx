"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { createSkill, updateSkill, deleteSkill } from "@/lib/actions/skills"
import type { Skill } from "@/lib/types/database"

interface SkillsManagerProps {
  skills: Skill[]
}

export function SkillsManager({ skills }: SkillsManagerProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [editingSkill, setEditingSkill] = React.useState<Skill | null>(null)
  const [name, setName] = React.useState("")
  const [category, setCategory] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null)

  const grouped = React.useMemo(() => {
    const map = new Map<string, Skill[]>()
    for (const skill of skills) {
      const cat = skill.category ?? "Uncategorized"
      const list = map.get(cat) ?? []
      list.push(skill)
      map.set(cat, list)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [skills])

  function openCreate() {
    setEditingSkill(null)
    setName("")
    setCategory("")
    setDialogOpen(true)
  }

  function openEdit(skill: Skill) {
    setEditingSkill(skill)
    setName(skill.name)
    setCategory(skill.category ?? "")
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!name.trim()) return
    setLoading(true)
    try {
      if (editingSkill) {
        await updateSkill(editingSkill.id, name.trim(), category.trim() || null)
      } else {
        await createSkill(name.trim(), category.trim() || null)
      }
      setDialogOpen(false)
      setEditingSkill(null)
      setName("")
      setCategory("")
    } catch {
      // error handled silently
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    setLoading(true)
    try {
      await deleteSkill(id)
      setDeleteConfirm(null)
    } catch {
      // error handled silently
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Skills</h1>
          <p className="text-muted-foreground mt-2">
            Manage skills taxonomy for your organization.
          </p>
        </div>
        <Button onClick={openCreate}>Add Skill</Button>
      </div>

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No skills defined yet. Click &quot;Add Skill&quot; to get started.
          </CardContent>
        </Card>
      ) : (
        grouped.map(([cat, catSkills]) => (
          <Card key={cat}>
            <CardHeader>
              <CardTitle>{cat}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {catSkills.map((skill) => (
                  <div key={skill.id} className="group relative">
                    {deleteConfirm === skill.id ? (
                      <div className="flex items-center gap-1 rounded-md border border-destructive p-1">
                        <span className="text-sm px-2">Delete &quot;{skill.name}&quot;?</span>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(skill.id)}
                          disabled={loading}
                        >
                          Yes
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteConfirm(null)}
                        >
                          No
                        </Button>
                      </div>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="cursor-pointer gap-1.5 pr-1"
                        onClick={() => openEdit(skill)}
                      >
                        <span>{skill.name}</span>
                        <button
                          type="button"
                          className="ml-1 rounded-sm hover:bg-destructive/20 p-0.5"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConfirm(skill.id)
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M18 6 6 18" />
                            <path d="m6 6 12 12" />
                          </svg>
                        </button>
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSkill ? "Edit Skill" : "Add Skill"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="skill-name">Name</Label>
              <Input
                id="skill-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. React, Project Management"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="skill-category">Category</Label>
              <Input
                id="skill-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Frontend, Soft Skills"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !name.trim()}>
              {loading ? "Saving..." : editingSkill ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
