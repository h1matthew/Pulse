/**
 * ImpactReport Component
 *
 * Displays a comprehensive impact report dialog showing how a user's engagement
 * strengthens their local economy. Features include:
 * - Visual preview with charts and metrics
 * - Raw data table view
 * - CSV export functionality
 * - Print-optimized layout
 * - Date range filtering (week, month, all-time)
 *
 * The report includes economic metrics (dollars kept local, jobs impacted),
 * activity breakdowns by category, and detailed timelines of user actions.
 *
 * @example
 * ```tsx
 * <ImpactReportDialog
 *   open={showReport}
 *   onOpenChange={setShowReport}
 *   userId={user.id}
 *   userName={user.name}
 * />
 * ```
 */
"use client"

import { useState, useRef, useMemo } from "react"
import {
  DollarSign,
  Store,
  Briefcase,
  Leaf,
  FileText,
  Printer,
  Download,
  Star,
  Clock,
  MapPin,
  Bookmark,
  Tag,
  Trophy,
  ArrowUpDown,
  Filter,
  Crown,
  Shield,
  Sparkles,
  Heart,
  Sprout,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { useImpactReport } from "@/hooks/useImpact"
import {
  type DateRangeOption,
  type ImpactReportData,
  getDateRangeParams,
  getDateRangeLabel,
  generateCSV,
  downloadCSV,
} from "@/lib/report-generator"
import { format } from "date-fns"
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from "recharts"

// ============================================================================
// Chart Colors (match theme.css --chart-1 through --chart-5)
// ============================================================================

/** Fallback hex colors for SSR / environments without CSS variable access */
const FALLBACK_CHART_COLORS = [
  "#0d9488", // teal
  "#e07a5f", // coral
  "#4ade80", // green
  "#a78bfa", // purple
  "#facc15", // yellow
]

/** Reads resolved chart colors from the current theme's CSS variables */
function getResolvedChartColors(): string[] {
  if (typeof window === "undefined") return FALLBACK_CHART_COLORS
  const style = getComputedStyle(document.documentElement)
  return FALLBACK_CHART_COLORS.map((fallback, i) => {
    const value = style.getPropertyValue(`--chart-${i + 1}`).trim()
    return value || fallback
  })
}

// ============================================================================
// Main Dialog
// ============================================================================

/** Props for the ImpactReportDialog component */
interface ImpactReportDialogProps {
  /** Whether the dialog is currently open */
  open: boolean
  /** Callback when the open state changes (user closes dialog) */
  onOpenChange: (open: boolean) => void
  /** Supabase user ID to fetch impact data for */
  userId: string
  /** Display name of the user (shown in report header) */
  userName: string
}

export function ImpactReportDialog({
  open,
  onOpenChange,
  userId,
  userName,
}: ImpactReportDialogProps) {
  const [dateRange, setDateRange] = useState<DateRangeOption>("all_time")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const printRef = useRef<HTMLDivElement>(null)

  const params = useMemo(() => getDateRangeParams(dateRange), [dateRange])
  const { data: report, isLoading, error } = useImpactReport(params)

  // Derive available categories from report data
  const availableCategories = useMemo(() => {
    if (!report) return []
    const cats = new Set<string>()
    for (const b of report.businesses) cats.add(b.category)
    for (const c of report.categoryBreakdown) cats.add(c.category)
    return Array.from(cats).sort()
  }, [report])

  // Apply category filter to produce the displayed report
  const filteredReport = useMemo(() => {
    if (!report || categoryFilter === "all") return report
    return {
      ...report,
      businesses: report.businesses.filter((b) => b.category === categoryFilter),
      categoryBreakdown: report.categoryBreakdown.filter((c) => c.category === categoryFilter),
      reviews: report.reviews.filter((r) =>
        report.businesses.some((b) => b.category === categoryFilter && b.name === r.businessName)
      ),
      deals: report.deals.filter((d) =>
        report.businesses.some((b) => b.category === categoryFilter && b.name === d.businessName)
      ),
      timeline: report.timeline.filter((t) =>
        !t.businessName || report.businesses.some((b) => b.category === categoryFilter && b.name === t.businessName)
      ),
    }
  }, [report, categoryFilter])

  function handlePrint() {
    if (!printRef.current) return

    // Build a standalone print document in a hidden iframe.
    // This completely avoids dark-mode, dialog CSS, and Tailwind class issues.
    const iframe = document.createElement("iframe")
    iframe.style.position = "fixed"
    iframe.style.top = "-10000px"
    iframe.style.left = "-10000px"
    iframe.style.width = "8.5in"
    iframe.style.height = "11in"
    document.body.appendChild(iframe)

    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) {
      document.body.removeChild(iframe)
      return
    }

    // Collect all stylesheets from the parent page for chart/badge/icon colors
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((el) => el.outerHTML)
      .join("\n")

    // Build HTML: light mode, white background, with all parent styles
    doc.open()
    doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  ${styles}
  <style>
    /* Force light mode — override any dark theme */
    :root {
      --background: oklch(0.98 0.005 250);
      --foreground: oklch(0.2 0.02 250);
      --card: oklch(1 0 0);
      --card-foreground: oklch(0.2 0.02 250);
      --muted: oklch(0.95 0.01 250);
      --muted-foreground: oklch(0.55 0.02 250);
      --border: oklch(0.9 0.01 250);
      --primary: oklch(0.6 0.18 175);
      --secondary: oklch(0.92 0.05 45);
      --secondary-foreground: oklch(0.3 0.08 45);
      --chart-1: oklch(0.6 0.18 175);
      --chart-2: oklch(0.7 0.16 45);
      --chart-3: oklch(0.65 0.14 145);
      --chart-4: oklch(0.6 0.15 280);
      --chart-5: oklch(0.75 0.18 85);
      color-scheme: light;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: white !important;
      color: #1f2937 !important;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    @page { margin: 0.5in 0.6in; size: letter; }

    /* Report layout */
    .impact-report-printable { padding: 0; }
    .impact-report-printable > * { margin-bottom: 14px; }

    /* Section headings */
    h3, h4 {
      font-size: 10.5pt;
      font-weight: 700;
      color: #111;
      border-bottom: 1.5px solid #d1d5db;
      padding-bottom: 3px;
      margin-bottom: 6px;
      break-after: avoid;
    }

    /* Cards: flat */
    [class*="card"] {
      box-shadow: none !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 2px !important;
      background: white !important;
    }

    /* Tables */
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th {
      border: 1px solid #d1d5db;
      padding: 4px 8px;
      background: #f3f4f6 !important;
      font-weight: 600;
      text-align: left;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #374151;
    }
    td {
      border: 1px solid #e5e7eb;
      padding: 4px 8px;
      color: #1f2937;
    }
    tr:nth-child(even) td { background: #f9fafb !important; }

    /* Grid: force 4 columns */
    .grid {
      display: grid !important;
      grid-template-columns: repeat(4, 1fr) !important;
      gap: 8px !important;
    }

    /* Chart: compact */
    .report-chart-container { height: 170px !important; }
    .recharts-responsive-container { height: 170px !important; }

    /* Badges */
    [class*="badge"] {
      border: 1px solid #d1d5db !important;
      background: #f3f4f6 !important;
      color: #1f2937 !important;
      box-shadow: none !important;
      font-size: 8pt;
      padding: 1px 5px !important;
      border-radius: 2px !important;
    }

    /* Sort arrows: hide */
    button[aria-label^="Sort by"] svg { display: none !important; }

    /* Stars */
    svg.lucide-star { width: 9px !important; height: 9px !important; }

    /* Footer */
    .print-footer {
      display: block !important;
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #d1d5db;
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
    }

    /* Page breaks */
    .impact-report-printable > div { break-inside: avoid; }
    table { break-inside: auto; }
    tr { break-inside: avoid; }
  </style>
</head>
<body>${printRef.current.outerHTML}</body>
</html>`)
    doc.close()

    // Wait for styles to load, then print. Clean up after dialog closes.
    const win = iframe.contentWindow
    if (!win) { document.body.removeChild(iframe); return }

    win.addEventListener("afterprint", () => {
      document.body.removeChild(iframe)
    })

    // Poll for document ready before triggering print
    const waitForReady = setInterval(() => {
      if (iframe.contentDocument?.readyState === "complete") {
        clearInterval(waitForReady)
        win.focus()
        win.print()
      }
    }, 50)
  }

  function handleDownloadCSV() {
    if (!filteredReport) return
    const csv = generateCSV(filteredReport)
    const rangeLabel = dateRange.replace("_", "-")
    const catLabel = categoryFilter !== "all" ? `-${categoryFilter.toLowerCase().replace(/\s+/g, "-")}` : ""
    downloadCSV(csv, `pulse-impact-report-${rangeLabel}${catLabel}.csv`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Your Impact Report
              </DialogTitle>
              <DialogDescription>
                See how your engagement strengthens the local economy
              </DialogDescription>
            </div>
            <div className="no-print flex items-center gap-2">
              {availableCategories.length > 1 && (
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-[150px]" aria-label="Category filter">
                    <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select
                value={dateRange}
                onValueChange={(v) => setDateRange(v as DateRangeOption)}
              >
                <SelectTrigger className="w-[140px]" aria-label="Date range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {error ? (
          <div className="flex-1 flex items-center justify-center p-8 text-destructive">
            Failed to load report data. Please try again.
          </div>
        ) : (
          <Tabs defaultValue="preview" className="flex-1 overflow-hidden">
            <TabsList className="no-print">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="data">Data Table</TabsTrigger>
            </TabsList>

            <TabsContent
              value="preview"
              className="overflow-y-auto max-h-[60vh] pr-2"
            >
              <div ref={printRef} className="impact-report-printable space-y-6">
                {isLoading || !filteredReport ? (
                  <ReportSkeleton />
                ) : (
                  <>
                    <ReportHeader
                      userName={userName}
                      tier={filteredReport.tier}
                      dateRange={filteredReport.dateRange}
                      categoryFilter={categoryFilter !== "all" ? categoryFilter : undefined}
                    />
                    <ReportImpactSummary metrics={filteredReport.metrics} />
                    {filteredReport.categoryBreakdown.length > 0 && (
                      <ReportCategoryChart data={filteredReport.categoryBreakdown} />
                    )}
                    {filteredReport.businesses.length > 0 && (
                      <ReportBusinessTable businesses={filteredReport.businesses} />
                    )}
                    {filteredReport.reviews.length > 0 && (
                      <ReportReviewList reviews={filteredReport.reviews} />
                    )}
                    {filteredReport.deals.length > 0 && (
                      <ReportDealsList deals={filteredReport.deals} />
                    )}
                    {filteredReport.timeline.length > 0 && (
                      <ReportTimeline timeline={filteredReport.timeline} />
                    )}
                    {filteredReport.metrics.totalCheckIns === 0 &&
                      filteredReport.reviews.length === 0 &&
                      filteredReport.deals.length === 0 && (
                        <EmptyState dateRange={dateRange} />
                      )}
                    <div className="print-footer">
                      Generated by Pulse · {format(new Date(), "MMMM d, yyyy")}
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="data"
              className="overflow-y-auto max-h-[60vh] pr-2"
            >
              {isLoading || !filteredReport ? (
                <ReportSkeleton />
              ) : (
                <ReportDataTable report={filteredReport} />
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={handlePrint} disabled={!filteredReport}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
          <Button onClick={handleDownloadCSV} disabled={!filteredReport}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

/** Map tier emoji strings from the API to reliable Lucide icons */
const TIER_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "🦸": Shield,     // Economic Hero
  "👑": Crown,      // Local Legend
  "🏆": Trophy,     // Pulse Champion
  "🌟": Sparkles,   // Community Advocate
  "💚": Heart,      // Local Supporter
  "🌱": Sprout,     // Pulse Newcomer
}

function ReportHeader({
  userName,
  tier,
  dateRange,
  categoryFilter,
}: {
  userName: string
  tier: { name: string; icon: string }
  dateRange: { from: string | null; to: string }
  categoryFilter?: string
}) {
  const fromLabel = dateRange.from
    ? format(new Date(dateRange.from), "MMM d, yyyy")
    : "All Time"
  const toLabel = format(new Date(dateRange.to), "MMM d, yyyy")
  const rangeText = dateRange.from ? `${fromLabel} — ${toLabel}` : "All Time"

  const TierIcon = TIER_ICONS[tier.icon] ?? Trophy

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xl font-bold">{userName}&apos;s Impact Report</h3>
        <p className="text-sm text-muted-foreground">
          {rangeText}
          {categoryFilter && (
            <span className="ml-2 inline-flex items-center">
              · <Filter className="h-3 w-3 mx-1" /> {categoryFilter}
            </span>
          )}
        </p>
      </div>
      <Badge variant="secondary" className="text-sm gap-1.5 py-1 px-3">
        <TierIcon className="h-4 w-4" />
        {tier.name}
      </Badge>
    </div>
  )
}

function ReportImpactSummary({
  metrics,
}: {
  metrics: ImpactReportData["metrics"]
}) {
  const cards = [
    {
      label: "Dollars Kept Local",
      value: `$${metrics.dollarsKeptLocal.toLocaleString()}`,
      icon: DollarSign,
      color: "bg-primary",
    },
    {
      label: "Businesses Supported",
      value: metrics.businessesSupported.toString(),
      icon: Store,
      color: "bg-chart-2",
    },
    {
      label: "Jobs Impacted",
      value: metrics.jobsImpacted.toString(),
      icon: Briefcase,
      color: "bg-chart-3",
    },
    {
      label: "Carbon Saved",
      value: `${metrics.carbonSaved} lbs`,
      icon: Leaf,
      color: "bg-chart-4",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-lg ${card.color} flex items-center justify-center flex-shrink-0`}
            >
              <card.icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-lg font-bold leading-tight">
                {card.value}
              </div>
              <div className="text-xs text-muted-foreground">{card.label}</div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ReportCategoryChart({
  data,
}: {
  data: ImpactReportData["categoryBreakdown"]
}) {
  const colors = useMemo(() => getResolvedChartColors(), [])

  const chartData = data.map((item, i) => ({
    name: item.category,
    value: item.checkIns,
    dollars: item.dollarsSpent,
    fill: colors[i % colors.length],
  }))

  return (
    <div>
      <h4 className="text-sm font-semibold mb-3">Category Breakdown</h4>
      <Card>
        <CardContent className="p-4">
          <div className="h-[280px] report-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="40%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={({ percent }: PieLabelRenderProps) =>
                    `${(((percent as number) ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, _name, props) => {
                    const entry = props.payload
                    return [
                      `${value} check-ins · $${(entry.dollars ?? 0).toLocaleString()} spent`,
                      entry.name,
                    ]
                  }}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={10}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

type BusinessSortKey = "name" | "checkIns" | "totalSpent" | "lastVisit"
type SortDir = "asc" | "desc"

function ReportBusinessTable({
  businesses,
}: {
  businesses: ImpactReportData["businesses"]
}) {
  const [sortKey, setSortKey] = useState<BusinessSortKey>("totalSpent")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => {
    const copy = [...businesses]
    copy.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case "name":
          cmp = a.name.localeCompare(b.name)
          break
        case "checkIns":
          cmp = a.checkIns - b.checkIns
          break
        case "totalSpent":
          cmp = a.totalSpent - b.totalSpent
          break
        case "lastVisit":
          cmp = new Date(a.lastVisit).getTime() - new Date(b.lastVisit).getTime()
          break
      }
      return sortDir === "asc" ? cmp : -cmp
    })
    return copy
  }, [businesses, sortKey, sortDir])

  function toggleSort(key: BusinessSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "name" ? "asc" : "desc")
    }
  }

  function SortHeader({ label, field, align }: { label: string; field: BusinessSortKey; align?: "right" }) {
    const active = sortKey === field
    return (
      <th className={`${align === "right" ? "text-right" : "text-left"} p-3 font-medium`}>
        <button
          onClick={() => toggleSort(field)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
          aria-label={`Sort by ${label}`}
        >
          {label}
          <ArrowUpDown className={`h-3 w-3 ${active ? "text-primary" : "text-muted-foreground/50"}`} />
        </button>
      </th>
    )
  }

  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <MapPin className="h-4 w-4" />
        Businesses Supported ({businesses.length})
      </h4>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <SortHeader label="Business" field="name" />
                  <th className="text-left p-3 font-medium">Category</th>
                  <SortHeader label="Visits" field="checkIns" align="right" />
                  <SortHeader label="Spent" field="totalSpent" align="right" />
                  <SortHeader label="Last Visit" field="lastVisit" align="right" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((b, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3 font-medium">{b.name}</td>
                    <td className="p-3 text-muted-foreground">{b.category}</td>
                    <td className="p-3 text-right">{b.checkIns}</td>
                    <td className="p-3 text-right">
                      ${b.totalSpent.toLocaleString()}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {format(new Date(b.lastVisit), "MMM d, yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReportReviewList({
  reviews,
}: {
  reviews: ImpactReportData["reviews"]
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Star className="h-4 w-4" />
        Reviews ({reviews.length})
      </h4>
      <Card>
        <CardContent className="p-4 space-y-3">
          {reviews.map((r, i) => (
            <div key={i}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{r.businessName}</div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {r.content}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star
                        key={si}
                        className={`h-3 w-3 ${
                          si < r.rating
                            ? "fill-chart-5 text-chart-5"
                            : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {format(new Date(r.createdAt), "MMM d")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ReportDealsList({ deals }: { deals: ImpactReportData["deals"] }) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Tag className="h-4 w-4" />
        Deals Claimed ({deals.length})
      </h4>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Deal</th>
                  <th className="text-left p-3 font-medium">Business</th>
                  <th className="text-right p-3 font-medium">Claimed</th>
                  <th className="text-right p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((d, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-3 font-medium">{d.dealTitle}</td>
                    <td className="p-3 text-muted-foreground">
                      {d.businessName}
                    </td>
                    <td className="p-3 text-right text-muted-foreground">
                      {format(new Date(d.claimedAt), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 text-right">
                      <Badge
                        variant={d.redeemedAt ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {d.redeemedAt ? "Redeemed" : "Pending"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReportTimeline({
  timeline,
}: {
  timeline: ImpactReportData["timeline"]
}) {
  const typeIcons: Record<string, React.ReactNode> = {
    "Check-in": <MapPin className="h-3.5 w-3.5" />,
    Review: <Star className="h-3.5 w-3.5" />,
    "Deal Claimed": <Tag className="h-3.5 w-3.5" />,
    Bookmark: <Bookmark className="h-3.5 w-3.5" />,
    "Mission Complete": <Trophy className="h-3.5 w-3.5" />,
  }

  return (
    <div>
      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Activity Timeline
      </h4>
      <Card>
        <CardContent className="p-4 space-y-2">
          {timeline.slice(0, 20).map((item, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                {typeIcons[item.type] || (
                  <Clock className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{item.type}</span>
                {item.businessName && (
                  <span className="text-sm text-muted-foreground">
                    {" "}
                    — {item.businessName}
                  </span>
                )}
                <span className="text-xs text-muted-foreground block">
                  {item.detail}
                </span>
              </div>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {format(new Date(item.date), "MMM d")}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function ReportDataTable({ report }: { report: ImpactReportData }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold mb-2">Impact Summary</h4>
        <table className="w-full text-sm border">
          <tbody>
            <tr className="border-b">
              <td className="p-2 font-medium">Dollars Kept Local</td>
              <td className="p-2 text-right">
                ${report.metrics.dollarsKeptLocal.toLocaleString()}
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium">Businesses Supported</td>
              <td className="p-2 text-right">
                {report.metrics.businessesSupported}
              </td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium">Jobs Impacted</td>
              <td className="p-2 text-right">{report.metrics.jobsImpacted}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium">Carbon Saved (lbs)</td>
              <td className="p-2 text-right">{report.metrics.carbonSaved}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium">Reviews Left</td>
              <td className="p-2 text-right">{report.metrics.reviewsLeft}</td>
            </tr>
            <tr className="border-b">
              <td className="p-2 font-medium">Deals Claimed</td>
              <td className="p-2 text-right">{report.metrics.dealsClaimed}</td>
            </tr>
            <tr>
              <td className="p-2 font-medium">Total Check-ins</td>
              <td className="p-2 text-right">
                {report.metrics.totalCheckIns}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {report.businesses.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Businesses</h4>
          <table className="w-full text-sm border">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Category</th>
                <th className="text-right p-2">Visits</th>
                <th className="text-right p-2">Spent</th>
              </tr>
            </thead>
            <tbody>
              {report.businesses.map((b, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-2">{b.name}</td>
                  <td className="p-2">{b.category}</td>
                  <td className="p-2 text-right">{b.checkIns}</td>
                  <td className="p-2 text-right">
                    ${b.totalSpent.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.reviews.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Reviews</h4>
          <table className="w-full text-sm border">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2">Business</th>
                <th className="text-right p-2">Rating</th>
                <th className="text-left p-2">Content</th>
                <th className="text-right p-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {report.reviews.map((r, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="p-2">{r.businessName}</td>
                  <td className="p-2 text-right">{r.rating}/5</td>
                  <td className="p-2 max-w-xs truncate">{r.content}</td>
                  <td className="p-2 text-right">
                    {format(new Date(r.createdAt), "MMM d, yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EmptyState({ dateRange }: { dateRange: DateRangeOption }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileText className="h-6 w-6 text-muted-foreground" />
      </div>
      <h4 className="font-medium mb-1">No activity yet</h4>
      <p className="text-sm text-muted-foreground max-w-sm">
        {dateRange === "all_time"
          ? "Start discovering local businesses to build your impact report!"
          : `No activity found for ${getDateRangeLabel(dateRange).toLowerCase()}. Try selecting a wider date range.`}
      </p>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-[250px] rounded-lg" />
      <Skeleton className="h-40 rounded-lg" />
    </div>
  )
}
