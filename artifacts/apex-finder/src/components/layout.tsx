import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Crosshair, Activity, Network, FileTerminal, KanbanSquare, Database } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const navItems = [
    { name: "Intelligence HQ", href: "/", icon: Activity },
    { name: "Network Graph", href: "/graph", icon: Network },
    { name: "MCTS Terminal", href: "/research", icon: FileTerminal },
    { name: "Pipeline CRM", href: "/crm", icon: KanbanSquare },
    { name: "Entity Ledger", href: "/entities", icon: Database },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Crosshair className="h-5 w-5 text-primary mr-3 flex-shrink-0" />
          <h1 className="text-lg font-bold tracking-widest text-primary uppercase font-mono leading-tight">ApexFinder Pro</h1>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            // active if exact match or the path starts with the nav href (for /graph?entity=N)
            const isActive = location === item.href || location.startsWith(item.href + "?") || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className={cn(
                  "h-4 w-4 mr-3 flex-shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground"
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="px-3 py-2 text-xs font-mono text-muted-foreground/50 uppercase tracking-widest">
            v0.1 · Personal Build
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="flex-1 flex flex-col relative z-10 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
