import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { 
  useListSlots, 
  useListMarkets, 
  useCreateSlot, 
  useUpdateSlot, 
  useAssignVendorToSlot,
  useVacateSlot,
  useListVendors,
  getListSlotsQueryKey
} from "@workspace/api-client-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatRWF, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, MoreHorizontal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createSlotSchema = z.object({
  marketId: z.coerce.number().min(1, "Market is required"),
  slotNumber: z.string().min(1, "Slot number is required"),
  zone: z.string().min(1, "Zone is required"),
  slotSize: z.string().min(1, "Size is required"),
  slotType: z.string().min(1, "Type is required"),
  monthlyFee: z.coerce.number().min(0, "Fee must be positive"),
  notes: z.string().optional()
});

const assignVendorSchema = z.object({
  vendorId: z.coerce.number().min(1, "Vendor is required"),
  contractStartDate: z.string().min(1, "Start date is required"),
  contractEndDate: z.string().optional(),
  paymentCycle: z.string().min(1, "Payment cycle is required"),
  firstPaymentDueDate: z.string().min(1, "First payment due date is required")
});

export default function SlotsPage() {
  const [marketId, setMarketId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<number | null>(null);

  const { data: markets } = useListMarkets();
  const { data: vendors } = useListVendors();
  const { data: slots, isLoading } = useListSlots({ 
    marketId: marketId !== "all" ? parseInt(marketId) : null,
    status: status !== "all" ? status : null
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const createSlot = useCreateSlot();
  const assignVendor = useAssignVendorToSlot();
  const vacateSlot = useVacateSlot();

  const createForm = useForm<z.infer<typeof createSlotSchema>>({
    resolver: zodResolver(createSlotSchema),
    defaultValues: {
      slotSize: "MEDIUM",
      slotType: "INDOOR"
    }
  });

  const assignForm = useForm<z.infer<typeof assignVendorSchema>>({
    resolver: zodResolver(assignVendorSchema),
    defaultValues: {
      paymentCycle: "MONTHLY",
      contractStartDate: new Date().toISOString().split('T')[0],
      firstPaymentDueDate: new Date().toISOString().split('T')[0]
    }
  });

  function onCreateSubmit(values: z.infer<typeof createSlotSchema>) {
    createSlot.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey() });
        setCreateOpen(false);
        createForm.reset();
        toast({ title: "Success", description: "Slot created successfully" });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.data?.error || "Failed to create slot" });
      }
    });
  }

  function onAssignSubmit(values: z.infer<typeof assignVendorSchema>) {
    if (!selectedSlotId) return;
    assignVendor.mutate({ id: selectedSlotId, data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey() });
        setAssignOpen(false);
        assignForm.reset();
        toast({ title: "Success", description: "Vendor assigned successfully" });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.data?.error || "Failed to assign vendor" });
      }
    });
  }

  function handleVacate(slotId: number) {
    if (confirm("Are you sure you want to vacate this slot?")) {
      vacateSlot.mutate({ id: slotId }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSlotsQueryKey() });
          toast({ title: "Success", description: "Slot vacated successfully" });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err.data?.error || "Failed to vacate slot" });
        }
      });
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Slots Management</h1>
            <p className="text-muted-foreground">Manage market stalls, warehouses, and spaces</p>
          </div>
          
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Slot</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create New Slot</DialogTitle></DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={createForm.control} name="marketId" render={({field}) => (
                      <FormItem>
                        <FormLabel>Market</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value?.toString()}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select market" /></SelectTrigger></FormControl>
                          <SelectContent>
                            {markets?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage/>
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="slotNumber" render={({field}) => (
                      <FormItem><FormLabel>Slot Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={createForm.control} name="zone" render={({field}) => (
                      <FormItem><FormLabel>Zone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={createForm.control} name="monthlyFee" render={({field}) => (
                      <FormItem><FormLabel>Monthly Fee (RWF)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={createForm.control} name="slotSize" render={({field}) => (
                      <FormItem>
                        <FormLabel>Size</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                          <SelectContent>
                            {["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage/>
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="slotType" render={({field}) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                          <SelectContent>
                            {["INDOOR", "OUTDOOR", "SEMI_COVERED", "WAREHOUSE"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage/>
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createSlot.isPending}>
                    {createSlot.isPending ? "Creating..." : "Create Slot"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle>Assign Vendor to Slot</DialogTitle></DialogHeader>
              <Form {...assignForm}>
                <form onSubmit={assignForm.handleSubmit(onAssignSubmit)} className="space-y-4">
                  <FormField control={assignForm.control} name="vendorId" render={({field}) => (
                    <FormItem>
                      <FormLabel>Vendor</FormLabel>
                      <Select onValueChange={field.onChange}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {vendors?.map(v => <SelectItem key={v.id} value={v.id.toString()}>{v.name} ({v.businessName || 'No business'})</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage/>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={assignForm.control} name="contractStartDate" render={({field}) => (
                      <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={assignForm.control} name="firstPaymentDueDate" render={({field}) => (
                      <FormItem><FormLabel>First Payment Due</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <FormField control={assignForm.control} name="paymentCycle" render={({field}) => (
                    <FormItem>
                      <FormLabel>Payment Cycle</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="MONTHLY">Monthly</SelectItem>
                          <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                          <SelectItem value="ANNUAL">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage/>
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={assignVendor.isPending}>
                    {assignVendor.isPending ? "Assigning..." : "Assign Vendor"}
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
                    <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                    <SelectItem value="OCCUPIED">OCCUPIED</SelectItem>
                    <SelectItem value="RESERVED">RESERVED</SelectItem>
                    <SelectItem value="UNDER_MAINTENANCE">MAINTENANCE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {slots?.length || 0} slots found
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slot</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">Loading slots...</TableCell></TableRow>
                ) : slots?.map(slot => (
                  <TableRow key={slot.id}>
                    <TableCell>
                      <div className="font-medium">{slot.slotNumber}</div>
                      <div className="text-xs text-muted-foreground">Zone {slot.zone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{slot.slotType}</div>
                      <div className="text-xs text-muted-foreground">{slot.slotSize}</div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatRWF(slot.monthlyFee)}
                    </TableCell>
                    <TableCell>
                      {slot.vendorName ? (
                        <div>
                          <div className="font-medium text-sm">{slot.vendorName}</div>
                          <div className="text-xs text-muted-foreground">Since {formatDate(slot.occupiedSince)}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={slot.status} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {slot.status === "AVAILABLE" && (
                            <DropdownMenuItem onClick={() => { setSelectedSlotId(slot.id); setAssignOpen(true); }}>
                              Assign Vendor
                            </DropdownMenuItem>
                          )}
                          {slot.status === "OCCUPIED" && (
                            <DropdownMenuItem onClick={() => handleVacate(slot.id)} className="text-red-600">
                              Vacate Slot
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && slots?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No slots found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
