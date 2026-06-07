import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { 
  useListPayments, 
  useListMarkets,
  useCreatePayment,
  getListPaymentsQueryKey
} from "@workspace/api-client-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRWF, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, CreditCard } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createPaymentSchema = z.object({
  vendorId: z.coerce.number().min(1, "Vendor ID required"),
  slotId: z.coerce.number().min(1, "Slot ID required"),
  marketId: z.coerce.number().min(1, "Market ID required"),
  amount: z.coerce.number().min(1, "Amount must be positive"),
  dueDate: z.string().min(1, "Due date required"),
  status: z.string().min(1, "Status required"),
  paymentCycle: z.string().min(1, "Cycle required"),
  paidDate: z.string().optional().or(z.literal(''))
});

export default function PaymentsPage() {
  const [marketId, setMarketId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: markets } = useListMarkets();
  const { data: payments, isLoading } = useListPayments({ 
    marketId: marketId !== "all" ? parseInt(marketId) : null,
    status: status !== "all" ? status : null
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createPayment = useCreatePayment();

  const form = useForm<z.infer<typeof createPaymentSchema>>({
    resolver: zodResolver(createPaymentSchema),
    defaultValues: {
      status: "PAID",
      paymentCycle: "MONTHLY",
      dueDate: new Date().toISOString().split('T')[0],
      paidDate: new Date().toISOString().split('T')[0]
    }
  });

  function onSubmit(values: z.infer<typeof createPaymentSchema>) {
    createPayment.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        setCreateOpen(false);
        form.reset();
        toast({ title: "Success", description: "Payment recorded successfully" });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.data?.error || "Failed to record payment" });
      }
    });
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments Log</h1>
            <p className="text-muted-foreground">Track stall rent payments and arrears</p>
          </div>
          
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Record Payment</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record Manual Payment</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField control={form.control} name="marketId" render={({field}) => (
                      <FormItem><FormLabel>Market ID</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="vendorId" render={({field}) => (
                      <FormItem><FormLabel>Vendor ID</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="slotId" render={({field}) => (
                      <FormItem><FormLabel>Slot ID</FormLabel><FormControl><Input type="number" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="amount" render={({field}) => (
                    <FormItem><FormLabel>Amount (RWF)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="dueDate" render={({field}) => (
                      <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="paidDate" render={({field}) => (
                      <FormItem><FormLabel>Paid Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="status" render={({field}) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="PAID">PAID</SelectItem>
                            <SelectItem value="DUE">DUE</SelectItem>
                            <SelectItem value="OVERDUE">OVERDUE</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="paymentCycle" render={({field}) => (
                      <FormItem>
                        <FormLabel>Cycle</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                            <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                            <SelectItem value="ANNUAL">Annual</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createPayment.isPending}>
                    {createPayment.isPending ? "Recording..." : "Save Record"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="py-4 border-b">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1 w-full flex items-center gap-4">
                <Select value={marketId} onValueChange={setMarketId}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Markets" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Markets</SelectItem>
                    {markets?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="PAID">PAID</SelectItem>
                    <SelectItem value="DUE">DUE</SelectItem>
                    <SelectItem value="OVERDUE">OVERDUE</SelectItem>
                    <SelectItem value="PARTIAL">PARTIAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor & Slot</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Paid Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">Loading payments...</TableCell></TableRow>
                ) : payments?.map(payment => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="font-medium">{payment.vendorName}</div>
                      <div className="text-xs text-muted-foreground">Slot: {payment.slotNumber}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatRWF(payment.amount)}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{payment.paymentCycle}</div>
                    </TableCell>
                    <TableCell className="text-sm">{payment.marketName}</TableCell>
                    <TableCell className="text-sm">{formatDate(payment.dueDate)}</TableCell>
                    <TableCell className="text-sm">{payment.paidDate ? formatDate(payment.paidDate) : "-"}</TableCell>
                    <TableCell><StatusBadge status={payment.status} /></TableCell>
                  </TableRow>
                ))}
                {!isLoading && payments?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No payments found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
