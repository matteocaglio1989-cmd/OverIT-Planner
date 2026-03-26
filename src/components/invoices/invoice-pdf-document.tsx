"use client"

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer"
import { Button } from "@/components/ui/button"
import type { Invoice, InvoiceLineItem, Client } from "@/lib/types/database"

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  companyName: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#111827",
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: "Helvetica-Bold",
    color: "#4F46E5",
    textAlign: "right",
  },
  invoiceNumber: {
    fontSize: 11,
    textAlign: "right",
    color: "#6B7280",
    marginTop: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#6B7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  label: {
    color: "#6B7280",
    width: 80,
  },
  value: {
    fontFamily: "Helvetica-Bold",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    paddingBottom: 6,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#F3F4F6",
  },
  colDescription: { flex: 3 },
  colQty: { flex: 1, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colAmount: { flex: 1, textAlign: "right" },
  headerText: {
    fontFamily: "Helvetica-Bold",
    color: "#6B7280",
    fontSize: 9,
    textTransform: "uppercase",
  },
  totalsSection: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalRow: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalLabel: {
    color: "#6B7280",
  },
  totalValue: {
    fontFamily: "Helvetica-Bold",
  },
  grandTotal: {
    flexDirection: "row",
    width: 200,
    justifyContent: "space-between",
    paddingVertical: 6,
    borderTopWidth: 1.5,
    borderTopColor: "#111827",
    marginTop: 4,
  },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#4F46E5",
  },
  notes: {
    marginTop: 30,
    padding: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
  },
  notesText: {
    fontSize: 9,
    color: "#6B7280",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9CA3AF",
  },
})

function formatAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

interface InvoiceDocumentProps {
  invoice: Invoice & { client?: Client | null }
  lineItems: InvoiceLineItem[]
}

function InvoiceDocument({ invoice, lineItems }: InvoiceDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>OverIT Planner</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
          </View>
        </View>

        {/* Client & Invoice Details */}
        <View style={{ flexDirection: "row", marginBottom: 30 }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.value}>
              {invoice.client?.name ?? "N/A"}
            </Text>
            {invoice.client?.contact_name && (
              <Text>{invoice.client.contact_name}</Text>
            )}
            {invoice.client?.contact_email && (
              <Text>{invoice.client.contact_email}</Text>
            )}
            {invoice.client?.billing_address && (
              <Text>{invoice.client.billing_address}</Text>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Details</Text>
            <View style={styles.row}>
              <Text style={styles.label}>Issue Date:</Text>
              <Text>{invoice.issue_date ?? "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Due Date:</Text>
              <Text>{invoice.due_date ?? "-"}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Status:</Text>
              <Text style={styles.value}>{invoice.status.toUpperCase()}</Text>
            </View>
            {invoice.payment_terms && (
              <View style={styles.row}>
                <Text style={styles.label}>Terms:</Text>
                <Text>{invoice.payment_terms}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDescription, styles.headerText]}>
              Description
            </Text>
            <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.headerText]}>
              Unit Price
            </Text>
            <Text style={[styles.colAmount, styles.headerText]}>Amount</Text>
          </View>
          {lineItems.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>
                {formatAmount(item.unit_price, invoice.currency)}
              </Text>
              <Text style={styles.colAmount}>
                {formatAmount(item.amount, invoice.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>
              {formatAmount(invoice.subtotal, invoice.currency)}
            </Text>
          </View>
          {invoice.tax_rate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({invoice.tax_rate}%)</Text>
              <Text style={styles.totalValue}>
                {formatAmount(invoice.tax_amount, invoice.currency)}
              </Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>
              {formatAmount(invoice.total, invoice.currency)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={[styles.sectionTitle, { marginBottom: 4 }]}>
              Notes
            </Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>
          Thank you for your business.
        </Text>
      </Page>
    </Document>
  )
}

export function PDFDownloadButton({ invoice, lineItems }: InvoiceDocumentProps) {
  async function handleDownload() {
    const blob = await pdf(
      <InvoiceDocument invoice={invoice} lineItems={lineItems} />
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${invoice.invoice_number}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" onClick={handleDownload}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Download PDF
    </Button>
  )
}
