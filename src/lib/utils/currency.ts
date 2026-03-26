const CURRENCY_CONFIG: Record<string, { locale: string; symbol: string }> = {
  USD: { locale: "en-US", symbol: "$" },
  EUR: { locale: "de-DE", symbol: "E" },
  GBP: { locale: "en-GB", symbol: "£" },
  CHF: { locale: "de-CH", symbol: "CHF" },
  CAD: { locale: "en-CA", symbol: "CA$" },
  AUD: { locale: "en-AU", symbol: "A$" },
  JPY: { locale: "ja-JP", symbol: "¥" },
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  const config = CURRENCY_CONFIG[currency]
  const locale = config?.locale ?? "en-US"

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: currency === "JPY" ? 0 : 2,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
