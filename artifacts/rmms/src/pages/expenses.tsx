import { useState } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { 
  useListExpenses, 
  useListMarkets,
  useCreateExpense,
  useDeleteExpense,
  getListExpensesQueryKey
} from "@workspace/api-client-react";
import { formatRWF, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

const createExpenseSchema = z.object({
  marketId: z.coerce.number().min(1, "Market is required"),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(1, "Amount must be positive"),
  expenseDate: z.string().min(1, "Date is required"),
});

export default function ExpensesPage() {
  const [marketId, setMarketId] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const { data: markets } = useListMarkets();
  const { data: expenses, isLoading } = useListExpenses({ 
    marketId: marketId !== "all" ? parseInt(marketId) : null,
    category: category !== "all" ? category : null
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();

  const form = useForm<z.infer<typeof createExpenseSchema>>({
    resolver: zodResolver(createExpenseSchema),
    defaultValues: {
      category: "MAINTENANCE",
      expenseDate: new Date().toISOString().split('T')[0]
    }
  });

  function onSubmit(values: z.infer<typeof createExpenseSchema>) {
    createExpense.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        setCreateOpen(false);
        form.reset();
        toast({ title: "Success", description: "Expense logged successfully" });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.data?.error || "Failed to log expense" });
      }
    });
  }

  function handleDelete(id: number) {
    if (confirm("Are you sure you want to delete this expense record?")) {
      deleteExpense.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          toast({ title: "Deleted", description: "Expense record removed" });
        }
      });
    }
  }

  const categories = ["MAINTENANCE", "SECURITY", "UTILITIES", "SALARY", "CLEANING", "OTHER"];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Market Expenses</h1>
            <p className="text-muted-foreground">Log and track operating costs</p>
          </div>
          
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" /> Log Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Record New Expense</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="marketId" render={({field}) => (
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
                  <FormField control={form.control} name="category" render={({field}) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage/>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({field}) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="amount" render={({field}) => (
                      <FormItem><FormLabel>Amount (RWF)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                    <FormField control={form.control} name="expenseDate" render={({field}) => (
                      <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage/></FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createExpense.isPending}>
                    {createExpense.isPending ? "Saving..." : "Save Expense"}
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
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Market</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">Loading expenses...</TableCell></TableRow>
                ) : expenses?.map(expense => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-sm font-medium">{formatDate(expense.expenseDate)}</TableCell>
                    <TableCell className="text-sm">{expense.marketName}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-mono text-[10px]">{expense.category}</Badge></TableCell>
                    <TableCell className="text-sm">{expense.description}</TableCell>
                    <TableCell className="font-medium">{formatRWF(expense.amount)}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(expense.id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && expenses?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No expenses found</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
