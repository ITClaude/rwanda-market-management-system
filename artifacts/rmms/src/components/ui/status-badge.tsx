import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type StatusType = 
  | "AVAILABLE" | "OCCUPIED" | "RESERVED" | "UNDER_MAINTENANCE"
  | "PAID" | "DUE" | "OVERDUE" | "PARTIAL"
  | "ACTIVE" | "INACTIVE" | "SUSPENDED"
  | "PENDING" | "SENT" | "FAILED";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  let colorClass = "bg-gray-100 text-gray-800 border-gray-200";

  switch (status.toUpperCase()) {
    // Green
    case "AVAILABLE":
    case "PAID":
    case "ACTIVE":
    case "SENT":
      colorClass = "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50";
      break;
    
    // Blue
    case "OCCUPIED":
      colorClass = "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50";
      break;

    // Yellow/Orange
    case "RESERVED":
    case "DUE":
    case "PARTIAL":
    case "PENDING":
      colorClass = "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800/50";
      break;

    // Red
    case "UNDER_MAINTENANCE":
    case "OVERDUE":
    case "SUSPENDED":
    case "FAILED":
      colorClass = "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50";
      break;

    // Gray
    case "INACTIVE":
      colorClass = "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
      break;
  }

  return (
    <Badge variant="outline" className={cn("font-medium", colorClass, className)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}
