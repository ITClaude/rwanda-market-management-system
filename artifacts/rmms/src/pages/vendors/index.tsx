import { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { 
  useListVendors, 
  useListMarkets,
  useCreateVendor,
  getListVendorsQueryKey
} from "@workspace/api-client-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Search, ChevronRight } from "lucide-react";
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

const createVendorSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email().optional().or(z.literal('')),
  nationalId: z.string().optional(),
  businessName: z.string().optional(),
  businessCategory: z.string().optional(),
  marketId: z.coerce.number().optional()
});

export default function VendorsPage() {
  const [marketId, setMarketId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: markets } = useListMarkets();
  const { data: vendors, isLoading } = useListVendors({ 
    marketId: marketId !== "all" ? parseInt(marketId) : null
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createVendor = useCreateVendor();

  const form = useForm<z.infer<typeof createVendorSchema>>({
    resolver: zodResolver(createVendorSchema),
    defaultValues: {
      name: "", phone: "", email: "", nationalId: "", businessName: "", businessCategory: ""
    }
  });

  function onSubmit(values: z.infer<typeof createVendorSchema>) {
    createVendor.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListVendorsQueryKey() });
        setCreateOpen(false);
        form.reset();
        toast({ title: "Success", description: "Vendor created successfully" });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.data?.error || "Failed to create vendor" });
      }
    });
  }

  const filteredVendors = vendors?.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) || 
    v.businessName?.toLowerCase().includes(search.toLowerCase()) ||
    v.phone.includes(search)
  );

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendors Registry</h1>
            <p className="text-muted-foreground">Manage market tenants and their businesses</p>
          </div>
          
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Add Vendor</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Register New Vendor</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({field}) => (
                    <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="phone" render={({field}) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="nationalId" render={({field}) => (
                      <FormItem><FormLabel>National ID</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="businessName" render={({field}) => (
                      <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="businessCategory" render={({field}) => (
                      <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createVendor.isPending}>
                    {createVendor.isPending ? "Registering..." : "Register Vendor"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader className="py-4 border-b">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={marketId} onValueChange={setMarketId}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Markets" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Markets</SelectItem>
                  {markets?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Slot</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">Loading vendors...</TableCell></TableRow>
                ) : filteredVendors?.map(vendor => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>
                      <div className="text-sm">{vendor.phone}</div>
                      <div className="text-xs text-muted-foreground">{vendor.email || "No email"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{vendor.businessName || "N/A"}</div>
                      <div className="text-xs text-muted-foreground">{vendor.businessCategory}</div>
                    </TableCell>
                    <TableCell>
                      {vendor.slotNumber ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{vendor.slotNumber}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No slot</span>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={vendor.status} /></TableCell>
                    <TableCell>
                      <Link href={`/vendors/${vendor.id}`}>
                        <Button variant="ghost" size="icon"><ChevronRight className="h-4 w-4" /></Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredVendors?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No vendors found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
