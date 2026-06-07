import { useParams } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useGetMarketDashboard, getGetMarketDashboardQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRWF, formatDate } from "@/lib/format";
import { 
  Grid, 
  Users, 
  Banknote, 
  AlertCircle, 
  Receipt,
  Bell
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";

export default function MarketDetailPage() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const { data: dashboard, isLoading } = useGetMarketDashboard(id, {
    query: {
      enabled: !!id,
      queryKey: getGetMarketDashboardQueryKey(id)
    }
  });

  if (isLoading) {
    return <AppLayout><div className="h-32 bg-muted animate-pulse rounded-xl" /></AppLayout>;
  }

  if (!dashboard) return <AppLayout>Market not found</AppLayout>;

  const { market } = dashboard;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{market.name}</h1>
              <StatusBadge status={market.status} />
            </div>
            <p className="text-muted-foreground flex items-center gap-2">
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{market.code}</span>
              <span>{market.location}, {market.district}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
              <Grid className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.occupancyRate}%</div>
              <Progress value={dashboard.occupancyRate} className="h-2 mt-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {dashboard.occupiedSlots} of {dashboard.totalSlots} slots occupied
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboard.totalVendors}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatRWF(dashboard.monthlyRevenue)}
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">Overdue Payments</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {formatRWF(dashboard.overdueAmount)}
              </div>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                {dashboard.overduePayments} overdue invoices
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Recent Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard.recentPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.vendorName}</TableCell>
                      <TableCell>{payment.slotNumber}</TableCell>
                      <TableCell>{formatRWF(payment.amount)}</TableCell>
                      <TableCell>{formatDate(payment.paidDate || payment.dueDate)}</TableCell>
                      <TableCell><StatusBadge status={payment.status} /></TableCell>
                    </TableRow>
                  ))}
                  {dashboard.recentPayments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">No recent payments</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              <div className="flex flex-col">
                {dashboard.recentNotifications.map(notification => (
                  <div key={notification.id} className="p-4 border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-sm">{notification.vendorName || "System"}</span>
                      <StatusBadge status={notification.status} className="text-[10px] px-1.5 py-0" />
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{notification.message}</p>
                    <div className="flex justify-between items-center text-[10px] text-muted-foreground">
                      <span className="capitalize">{notification.channel.toLowerCase()}</span>
                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                  </div>
                ))}
                {dashboard.recentNotifications.length === 0 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">No recent notifications</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </AppLayout>
  );
}
