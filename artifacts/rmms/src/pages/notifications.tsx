import { AppLayout } from "@/components/layout/app-layout";
import { 
  useListNotifications, 
  useTriggerNotifications,
  getListNotificationsQueryKey
} from "@workspace/api-client-react";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { BellRing, Mail, MessageSquare } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useListNotifications({ limit: 100 });
  const triggerMutation = useTriggerNotifications();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  function handleTrigger() {
    triggerMutation.mutate(undefined, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
        toast({ title: "Success", description: res.message });
      },
      onError: (err: any) => {
        toast({ variant: "destructive", title: "Error", description: err.data?.error || "Failed to trigger notifications" });
      }
    });
  }

  const getChannelIcon = (channel: string) => {
    switch(channel.toUpperCase()) {
      case 'SMS': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'EMAIL': return <Mail className="h-4 w-4 text-orange-500" />;
      default: return <BellRing className="h-4 w-4" />;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">System Notifications</h1>
            <p className="text-muted-foreground">Automated SMS and Email alerts</p>
          </div>
          
          <Button onClick={handleTrigger} disabled={triggerMutation.isPending}>
            <BellRing className="w-4 h-4 mr-2" />
            {triggerMutation.isPending ? "Running Check..." : "Trigger Overdue Alerts"}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Message Log</CardTitle>
            <CardDescription>Recent messages sent to vendors by the system</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Sent At</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Message Content</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">Loading notifications...</TableCell></TableRow>
                ) : notifications?.map(note => (
                  <TableRow key={note.id}>
                    <TableCell>{getChannelIcon(note.channel)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(note.createdAt)}</TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-[10px]">{note.type}</Badge></TableCell>
                    <TableCell className="font-medium text-sm">{note.vendorName || "System"}</TableCell>
                    <TableCell className="text-sm max-w-[300px] truncate" title={note.message}>{note.message}</TableCell>
                    <TableCell><StatusBadge status={note.status} /></TableCell>
                  </TableRow>
                ))}
                {!isLoading && notifications?.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No notifications log</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
