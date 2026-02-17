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

/** Color palette for charts - uses CSS variables to match theme */
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
] as const

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
  const printRef = useRef<HTMLDivElement>(null)

  const params = useMemo(() => getDateRangeParams(dateRange), [dateRange])
  const { data: report, isLoading, error } = useImpactReport(params)

  function handlePrint() {
    document.body.classList.add("printing-report")
    window.print()
    document.body.classList.remove("printing-report")
  }

  function handleDownloadCSV() {
    if (!report) return
    const csv = generateCSV(report)
    const rangeLabel = dateRange.replace("_", "-")
    downloadCSV(csv, `pulse-impact-report-${rangeLabel}.csv`)
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
            <div className="no-print">
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
                {isLoading || !report ? (
                  <ReportSkeleton />
                ) : (
                  <>
                    <ReportHeader
                      userName={userName}
                      tier={report.tier}
                      dateRange={report.dateRange}
                    />
                    <ReportImpactSummary metrics={report.metrics} />
                    {report.categoryBreakdown.length > 0 && (
                      <ReportCategoryChart data={report.categoryBreakdown} />
                    )}
                    {report.businesses.length > 0 && (
                      <ReportBusinessTable businesses={report.businesses} />
                    )}
                    {report.reviews.length > 0 && (
                      <ReportReviewList reviews={report.reviews} />
                    )}
                    {report.deals.length > 0 && (
                      <ReportDealsList deals={report.deals} />
                    )}
                    {report.timeline.length > 0 && (
                      <ReportTimeline timeline={report.timeline} />
                    )}
                    {report.metrics.totalCheckIns === 0 &&
                      report.reviews.length === 0 &&
                      report.deals.length === 0 && (
                        <EmptyState dateRange={dateRange} />
                      )}
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="data"
              className="overflow-y-auto max-h-[60vh] pr-2"
            >
              {isLoading || !report ? (
                <ReportSkeleton />
              ) : (
                <ReportDataTable report={report} />
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="no-print">
          <Button variant="outline" onClick={handlePrint} disabled={!report}>
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
          <Button onClick={handleDownloadCSV} disabled={!report}>
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

function ReportHeader({
  userName,
  tier,
  dateRange,
}: {
  userName: string
  tier: { name: string; icon: string }
  dateRange: { from: string | null; to: string }
}) {
  const fromLabel = dateRange.from
    ? format(new Date(dateRange.from), "MMM d, yyyy")
    : "All Time"
  const toLabel = format(new Date(dateRange.to), "MMM d, yyyy")
  const rangeText = dateRange.from ? `${fromLabel} — ${toLabel}` : "All Time"

  return (
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-xl font-bold">{userName}&apos;s Impact Report</h3>
        <p className="text-sm text-muted-foreground">{rangeText}</p>
      </div>
      <Badge variant="secondary" className="text-sm gap-1.5 py-1 px-3">
        <span>{tier.icon}</span>
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
  const chartData = data.map((item, i) => ({
    name: item.category,
    value: item.checkIns,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }))

  return (
    <div>
      <h4 className="text-sm font-semibold mb-3">Category Breakdown</h4>
      <Card>
        <CardContent className="p-4">
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                  label={(props: PieLabelRenderProps) =>
                    // Format: "Category 25%" - show category name and percentage
                    `${props.name ?? ''} ${(((props.percent as number) ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${value} check-ins`, "Visits"]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReportBusinessTable({
  businesses,
}: {
  businesses: ImpactReportData["businesses"]
}) {
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
                  <th className="text-left p-3 font-medium">Business</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-right p-3 font-medium">Visits</th>
                  <th className="text-right p-3 font-medium">Spent</th>
                  <th className="text-right p-3 font-medium">Last Visit</th>
                </tr>
              </thead>
              <tbody>
                {businesses.map((b, i) => (
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
