import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Compass, MessageSquare, User, LogIn, ShieldAlert, Store, Menu, Settings as SettingsIcon, Link as LinkIcon, UserCheck, LogOut, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadDocumentTitle } from "@/hooks/useUnreadThreads";
import { isAdminUsername } from "@/lib/admin";
import { shareReviewUrl } from "@/lib/shareLinks";
import { toast } from "@/hooks/use-toast";
import { useState, type ReactNode } from "react";
import { NotificationsBell } from "@/components/NotificationsBell";


function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span
      aria-label={`${count} unread thread${count === 1 ? "" : "s"}`}
      className="absolute -right-2 -top-2 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 ring-background"
    >
      {count >= 10 ? "9+" : count}
    </span>
  );
}


function SoonPill() {
  return (
    <span
      aria-label="Coming soon"
      className="absolute -right-3 -top-2 rounded-full bg-primary/15 px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.14em] text-primary ring-1 ring-primary/30"
    >
      Soon
    </span>
  );
}

type NavItem = { to: string; icon: typeof Compass; label: string; end?: boolean; authOnly?: boolean; admin?: boolean; soon?: boolean };

const baseItems: NavItem[] = [
  { to: "/explore", icon: Compass, label: "Explore", end: true },
  { to: "/marketplace", icon: Store, label: "Marketplace", soon: true },
  { to: "/messages", icon: MessageSquare, label: "Messages", authOnly: true },
  { to: "/me", icon: User, label: "Profile", authOnly: true },
  { to: "/admin", icon: ShieldAlert, label: "Admin", authOnly: true, admin: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const unread = useUnreadDocumentTitle("HireVy");
  const isAdmin = isAdminUsername(profile?.username);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const items = baseItems.filter((i) => {
    if (i.admin && !isAdmin) return false;
    if (i.authOnly && !user) return false;
    return true;
  });
  const profilePath = profile?.username ? `/@${profile.username}` : "/me";

  // Detect when the user is viewing their own profile (any of the profile URL shapes).
  const myHandle = profile?.username?.toLowerCase();
  const profileMatch = pathname.match(/^\/(?:@|coach\/)?([^/]+)\/?$/);
  const routeHandle = profileMatch?.[1]?.toLowerCase();
  const isOwnProfile = !!(user && myHandle && routeHandle && routeHandle === myHandle);

  const copyReviewLink = async () => {
    if (!profile?.username) return;
    const url = shareReviewUrl(profile.username);
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Review link copied", description: url });
    } catch {
      toast({ title: "Copy failed", description: url, variant: "destructive" });
    }
  };

  const mobileCols =
    items.length === 5 ? "grid-cols-5" :
    items.length === 4 ? "grid-cols-4" :
    items.length === 3 ? "grid-cols-3" :
    items.length === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4">
          <NavLink to={user ? "/explore" : "/"} className="flex items-center gap-2">
            <Logo />
          </NavLink>
          <div className="flex items-center gap-2">
            {isOwnProfile ? (
              <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    aria-label="Open profile menu"
                    className="flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-secondary"
                  >
                    <span className="text-xs uppercase tracking-[0.18em] text-primary">
                      @{profile?.username}
                    </span>
                    <Menu className="h-5 w-5 text-primary" />
                  </button>
                </SheetTrigger>
                <SheetContent
                  side="right"
                  className="w-[60vw] max-w-sm border-l border-border bg-background p-0"
                >
                  <nav className="flex flex-col gap-0.5 p-4 pt-12">
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); navigate("/settings/profile"); }}
                      className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <SettingsIcon className="h-4 w-4" /> Edit Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); void copyReviewLink(); }}
                      className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <LinkIcon className="h-4 w-4" /> Copy Review Link
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); navigate("/settings/following"); }}
                      className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <UserCheck className="h-4 w-4" /> Following
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); navigate("/settings/profile"); }}
                      className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <SettingsIcon className="h-4 w-4" /> Settings
                    </button>
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); navigate("/messages?team=1"); }}
                      className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                    >
                      <MessageCircle className="h-4 w-4" /> Send us a message
                    </button>
                    <button
                      type="button"
                      onClick={async () => { setMenuOpen(false); await signOut(); navigate("/"); }}
                      className="mt-1 flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" /> Log Out
                    </button>
                  </nav>
                </SheetContent>
              </Sheet>
            ) : user ? (
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
                  <span className="relative inline-flex">
                    <item.icon className="h-4 w-4" />
                    {item.to === "/messages" && <UnreadBadge count={unread} />}
                    {item.soon && <SoonPill />}
                    {item.admin && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-primary" />}
                  </span>
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
      <nav className={cn("fixed inset-x-0 bottom-0 z-40 grid border-t border-border bg-background/95 backdrop-blur md:hidden", mobileCols)}>
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
              <span className="relative inline-flex">
                <item.icon className="h-5 w-5" strokeWidth={1.5} />
                {item.to === "/messages" && <UnreadBadge count={unread} />}
                {item.soon && <SoonPill />}
                {item.admin && <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-primary" />}
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
