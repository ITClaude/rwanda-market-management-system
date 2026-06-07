import { useParams } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { useGetVendor, getGetVendorQueryKey, useListPayments } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRWF, formatDate } from "@/lib/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, Phone, Mail, Building, Briefcase, Calendar } from "lucide-react";

export default function VendorDetailPage() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  
  const { data: vendor, isLoading } = useGetVendor(id, {
    query: { enabled: !!id, queryKey: getGetVendorQueryKey(id) }
  });

  const { data: payments, isLoading: paymentsLoading } = useListPayments({ vendorId: id }, {
    query: { enabled: !!id }
  });

  if (isLoading) return <AppLayout><div className="h-32 bg-muted animate-pulse rounded-xl" /></AppLayout>;
  if (!vendor) return <AppLayout>Vendor not found</AppLayout>;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold tracking-tight">{vendor.name}</h1>
              <StatusBadge status={vendor.status} />
            </div>
            <p className="text-muted-foreground">Registered {formatDate(vendor.registeredAt)}</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-1">
            <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{vendor.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{vendor.email || "N/A"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>ID: {vendor.nationalId || "N/A"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Business Details</CardTitle></CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Briefcase className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{vendor.businessName || "Individual"}</div>
                    <div className="text-muted-foreground text-xs">{vendor.businessCategory || "Uncategorized"}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Building className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">Slot Assignment</div>
                    <div className="text-muted-foreground text-xs">
                      {vendor.slotNumber ? `Slot ${vendor.slotNumber}` : "No active slot"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Recent invoices and payments for this vendor</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Cycle</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Loading payments...</TableCell></TableRow>
                ) : payments?.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">{formatRWF(payment.amount)}</TableCell>
                    <TableCell>{formatDate(payment.dueDate)}</TableCell>
                    <TableCell>{payment.paidDate ? formatDate(payment.paidDate) : "-"}</TableCell>
                    <TableCell>{payment.slotNumber || "-"}</TableCell>
                    <TableCell className="capitalize">{payment.paymentCycle.toLowerCase()}</TableCell>
                    <TableCell><StatusBadge status={payment.status} /></TableCell>
                  </TableRow>
                ))}
                {!paymentsLoading && payments?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No payments found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
