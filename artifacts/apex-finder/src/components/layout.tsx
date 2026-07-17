import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Crosshair, Activity, Network, FileTerminal, KanbanSquare, Database, LogOut } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
          <Crosshair className="h-5 w-5 text-primary mr-3" />
          <h1 className="text-lg font-bold tracking-widest text-primary uppercase font-mono">ApexFinder Pro</h1>
        </div>
        
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href;
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
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md cursor-pointer transition-colors">
            <LogOut className="h-4 w-4 mr-3" />
            Disconnect
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255, 255, 255, 1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
        
        <div className="flex-1 flex flex-col relative z-10 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
