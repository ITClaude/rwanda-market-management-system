import { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useListMarkets, useCreateMarket, getListMarketsQueryKey } from "@workspace/api-client-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Plus, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const createMarketSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required"),
  location: z.string().min(1, "Location is required"),
  district: z.string().min(1, "District is required"),
  totalSlots: z.coerce.number().min(1, "Must have at least 1 slot"),
  status: z.string().default("ACTIVE"),
});

export default function MarketsPage() {
  const { data: markets, isLoading } = useListMarkets();
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMarket = useCreateMarket();

  const form = useForm<z.infer<typeof createMarketSchema>>({
    resolver: zodResolver(createMarketSchema),
    defaultValues: {
      name: "",
      code: "",
      location: "",
      district: "",
      totalSlots: 100,
      status: "ACTIVE",
    },
  });

  function onSubmit(values: z.infer<typeof createMarketSchema>) {
    createMarket.mutate(
      { data: values },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMarketsQueryKey() });
          setOpen(false);
          form.reset();
          toast({ title: "Market Created", description: "Successfully created new market." });
        },
        onError: (err: any) => {
          toast({ variant: "destructive", title: "Error", description: err?.data?.error || "Failed to create market." });
        }
      }
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
            <p className="text-muted-foreground">Manage all physical market locations</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Market
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Market</DialogTitle>
                <DialogDescription>Add a new market to the system.</DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({field}) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <FormField control={form.control} name="code" render={({field}) => (
                    <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="e.g. KGL-01" {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="location" render={({field}) => (
                      <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="district" render={({field}) => (
                      <FormItem><FormLabel>District</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="totalSlots" render={({field}) => (
                      <FormItem><FormLabel>Total Slots</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="status" render={({field}) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                            <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                            <SelectItem value="UNDER_CONSTRUCTION">UNDER CONSTRUCTION</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage/>
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createMarket.isPending}>
                    {createMarket.isPending ? "Creating..." : "Create Market"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {markets?.map(market => (
              <Card key={market.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl line-clamp-1" title={market.name}>{market.name}</CardTitle>
                    <StatusBadge status={market.status} />
                  </div>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{market.code}</span>
                    <span>•</span>
                    <span>{market.district}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <div className="space-y-4 mb-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Location</div>
                      <div className="text-sm">{market.location}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Capacity</div>
                      <div className="text-sm">{market.totalSlots} slots total</div>
                    </div>
                  </div>
                  <Link href={`/markets/${market.id}`} className="mt-auto">
                    <Button variant="secondary" className="w-full">
                      View Dashboard <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
