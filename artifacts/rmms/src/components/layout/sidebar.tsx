import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { 
  LayoutDashboard, 
  MapPin, 
  Grid, 
  Users, 
  CreditCard, 
  Receipt, 
  Bell, 
  LogOut 
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: MapPin },
  { href: "/slots", label: "Slots", icon: Grid },
  { href: "/vendors", label: "Vendors", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border w-64 shrink-0">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-primary-foreground font-bold">
            R
          </div>
          <div>
            <h1 className="font-bold text-sidebar-foreground tracking-tight leading-none text-lg">RMMS</h1>
            <p className="text-xs text-sidebar-foreground/70">Rwanda Markets</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className="block">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm font-medium",
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-sidebar-border">
        <div className="mb-4 px-2">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">{user?.name || "User"}</p>
          <p className="text-xs text-sidebar-foreground/70 truncate capitalize">{user?.role.toLowerCase().replace('_', ' ')}</p>
        </div>
        <Button variant="outline" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={logout}>
          <LogOut className="mr-2 w-4 h-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}
