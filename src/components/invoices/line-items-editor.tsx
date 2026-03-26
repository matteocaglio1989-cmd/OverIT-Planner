"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableFooter,
} from "@/components/ui/table"
import { addLineItem, updateLineItem, removeLineItem } from "@/lib/actions/invoices"
import { formatCurrency } from "@/lib/utils/currency"
import type { InvoiceLineItem } from "@/lib/types/database"

interface LineItemsEditorProps {
  invoiceId: string
  lineItems: InvoiceLineItem[]
  currency: string
  taxRate: number
  subtotal: number
  taxAmount: number
  total: number
  readonly?: boolean
}

export function LineItemsEditor({
  invoiceId,
  lineItems,
  currency,
  taxRate,
  subtotal,
  taxAmount,
  total,
  readonly = false,
}: LineItemsEditorProps) {
  const [isPending, startTransition] = useTransition()
  const [newDescription, setNewDescription] = useState("")
  const [newQuantity, setNewQuantity] = useState("")
  const [newUnitPrice, setNewUnitPrice] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDescription, setEditDescription] = useState("")
  const [editQuantity, setEditQuantity] = useState("")
  const [editUnitPrice, setEditUnitPrice] = useState("")

  function handleAdd() {
    const qty = parseFloat(newQuantity)
    const price = parseFloat(newUnitPrice)

    if (!newDescription.trim() || isNaN(qty) || isNaN(price)) return

    startTransition(async () => {
      await addLineItem(invoiceId, {
        description: newDescription.trim(),
        quantity: qty,
        unit_price: price,
      })
      setNewDescription("")
      setNewQuantity("")
      setNewUnitPrice("")
    })
  }

  function startEdit(item: InvoiceLineItem) {
    setEditingId(item.id)
    setEditDescription(item.description)
    setEditQuantity(String(item.quantity))
    setEditUnitPrice(String(item.unit_price))
  }

  function handleUpdate(id: string) {
    const qty = parseFloat(editQuantity)
    const price = parseFloat(editUnitPrice)

    if (!editDescription.trim() || isNaN(qty) || isNaN(price)) return

    startTransition(async () => {
      await updateLineItem(id, {
        description: editDescription.trim(),
        quantity: qty,
        unit_price: price,
      })
      setEditingId(null)
    })
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      await removeLineItem(id)
    })
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">Description</TableHead>
            <TableHead className="text-right">Quantity</TableHead>
            <TableHead className="text-right">Unit Price</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {!readonly && <TableHead className="w-24">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {lineItems.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={readonly ? 4 : 5}
                className="text-center py-8 text-muted-foreground"
              >
                No line items yet. Add one below.
              </TableCell>
            </TableRow>
          )}
          {lineItems.map((item) =>
            editingId === item.id ? (
              <TableRow key={item.id}>
                <TableCell>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="h-8"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="h-8 text-right w-24 ml-auto"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={editUnitPrice}
                    onChange={(e) => setEditUnitPrice(e.target.value)}
                    className="h-8 text-right w-28 ml-auto"
                  />
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(
                    (parseFloat(editQuantity) || 0) *
                      (parseFloat(editUnitPrice) || 0),
                    currency
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleUpdate(item.id)}
                      disabled={isPending}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              <TableRow key={item.id}>
                <TableCell>{item.description}</TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(item.unit_price, currency)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(item.amount, currency)}
                </TableCell>
                {!readonly && (
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(item)}
                        disabled={isPending}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleRemove(item.id)}
                        disabled={isPending}
                      >
                        Remove
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            )
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={readonly ? 3 : 3} className="text-right font-medium">
              Subtotal
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(subtotal, currency)}
            </TableCell>
            {!readonly && <TableCell />}
          </TableRow>
          {taxRate > 0 && (
            <TableRow>
              <TableCell colSpan={readonly ? 3 : 3} className="text-right font-medium">
                Tax ({taxRate}%)
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(taxAmount, currency)}
              </TableCell>
              {!readonly && <TableCell />}
            </TableRow>
          )}
          <TableRow>
            <TableCell colSpan={readonly ? 3 : 3} className="text-right text-base font-bold">
              Total
            </TableCell>
            <TableCell className="text-right text-base font-bold">
              {formatCurrency(total, currency)}
            </TableCell>
            {!readonly && <TableCell />}
          </TableRow>
        </TableFooter>
      </Table>

      {!readonly && (
        <div className="flex items-end gap-2 pt-2 border-t">
          <div className="flex-1 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Description
            </label>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Line item description"
              className="h-8"
            />
          </div>
          <div className="w-24 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Qty
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              placeholder="0"
              className="h-8 text-right"
            />
          </div>
          <div className="w-28 space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Unit Price
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={newUnitPrice}
              onChange={(e) => setNewUnitPrice(e.target.value)}
              placeholder="0.00"
              className="h-8 text-right"
            />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={isPending}>
            {isPending ? "Adding..." : "Add"}
          </Button>
        </div>
      )}
    </div>
  )
}
