"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import type { Invoice, InvoiceLineItem, Client } from "@/lib/types/database"

const PDFDownloadButton = dynamic(
  () => import("./invoice-pdf-document").then((mod) => mod.PDFDownloadButton),
  { ssr: false, loading: () => <Button disabled>Loading PDF...</Button> }
)

interface InvoicePDFProps {
  invoice: Invoice & { client?: Client | null }
  lineItems: InvoiceLineItem[]
}

export function InvoicePDF({ invoice, lineItems }: InvoicePDFProps) {
  return <PDFDownloadButton invoice={invoice} lineItems={lineItems} />
}
