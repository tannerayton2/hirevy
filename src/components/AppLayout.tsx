import { NavLink } from "react-router-dom";
import { Compass, MessageSquare, User, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

type NavItem = { to: string; icon: typeof Compass; label: string; end?: boolean; authOnly?: boolean };

const baseItems: NavItem[] = [
  { to: "/messages", icon: MessageSquare, label: "Messages", authOnly: true },
  { to: "/", icon: Compass, label: "Explore", end: true },
  { to: "/me", icon: User, label: "Profile", authOnly: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();

  const items = baseItems.filter((i) => (i.authOnly ? !!user : true));
  const profilePath = profile?.username ? `/@${profile.username}` : "/me";
  const mobileCols = items.length === 3 ? "grid-cols-3" : items.length === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <NavLink to="/" className="flex items-center gap-2">
            <Logo />
          </NavLink>
          <div className="flex items-center gap-2">
            {user ? (
              <NavLink to={profilePath} className="text-xs uppercase tracking-[0.18em] text-muted-foreground hover:text-foreground">
                @{profile?.username ?? "you"}
              </NavLink>
            ) : (
              <Button asChild size="sm" variant="default">
                <NavLink to="/auth"><LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign in</NavLink>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-border md:block">
          <nav className="sticky top-14 flex flex-col gap-0.5 p-3">
            {items.map((item) => {
              const to = item.to === "/me" ? profilePath : item.to;
              return (
                <NavLink
                  key={item.label}
                  to={to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors",
                      "hover:bg-secondary hover:text-foreground",
                      isActive && "bg-secondary text-foreground",
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="min-h-[calc(100vh-56px)] flex-1 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-border bg-background/95 backdrop-blur md:hidden">
        {items.map((item) => {
          const to = item.to === "/me" ? profilePath : item.to;
          return (
            <NavLink
              key={item.label}
              to={to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground",
                  isActive && "text-primary",
                )
              }
            >
              <item.icon className="h-5 w-5" strokeWidth={1.5} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
