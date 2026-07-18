import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Compass, MessagesSquare, User, LogIn, ShieldAlert, Store, Menu, Settings as SettingsIcon, Link as LinkIcon, UserCheck, LogOut, MessageCircle, FileText, Shield, Search, MessageSquare, MoreVertical, Eye, Share2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUnreadDocumentTitle } from "@/hooks/useUnreadThreads";
import { isAdminUsername } from "@/lib/admin";
import { shareReviewUrl, shareProfileUrl } from "@/lib/shareLinks";
import { toast } from "@/hooks/use-toast";
import { useState, type ReactNode } from "react";
import { NotificationsBell } from "@/components/NotificationsBell";
import { RightRail } from "@/components/RightRail";


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

type NavKind = "icon" | "avatar";
type NavItem = { to: string; icon: typeof Compass; label: string; end?: boolean; authOnly?: boolean; admin?: boolean; soon?: boolean; kind?: NavKind };

const baseItems: NavItem[] = [
  { to: "/explore", icon: Search, label: "Search", end: true },
  { to: "/messages", icon: MessageSquare, label: "Messages", authOnly: true },
  { to: "/me", icon: User, label: "Profile", authOnly: true, kind: "avatar" },
  { to: "/admin", icon: ShieldAlert, label: "Admin", authOnly: true, admin: true },
];

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const unread = useUnreadDocumentTitle("Aytopus");
  const isAdmin = isAdminUsername(profile?.username);
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Hide the mobile floating pill nav when an individual conversation is open
  // (chat thread, draft compose, or the Aytopus Team chat) so the chat view can
  // take the full height like Instagram DMs.
  const msgParams = new URLSearchParams(location.search);
  const inOpenConversation =
    pathname === "/messages" &&
    (!!msgParams.get("t") || !!msgParams.get("to") || msgParams.get("team") === "1");

  const isSubmitReview = pathname === "/submit-review";

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
        {isSubmitReview ? (
          <div className="relative mx-auto flex h-14 max-w-7xl items-center px-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-secondary"
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <NavLink
              to={user ? "/explore" : "/"}
              aria-label="Aytopus home"
              className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <Logo />
            </NavLink>
          </div>
        ) : (
          <div className="relative mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-4">
            {/* Left: notification bell */}
            <div className="flex items-center">
              {user ? (
                <NotificationsBell />
              ) : (
                <span className="h-9 w-9" aria-hidden />
              )}
            </div>

            {/* Center: logo */}
            <NavLink
              to={user ? "/explore" : "/"}
              aria-label="Aytopus home"
              className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <Logo />
            </NavLink>

            {/* Right: avatar / auth */}
            <div className="flex items-center">
              {isOwnProfile ? (
                <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      aria-label="Open profile menu"
                      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-secondary text-[11px] font-semibold uppercase text-muted-foreground ring-1 ring-border transition-colors hover:ring-primary"
                    >
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{(profile?.username ?? "?").slice(0, 1)}</span>
                      )}
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
                      <div className="mt-2 mb-1 px-3 pt-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/70">Legal</div>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); navigate("/terms"); }}
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        <FileText className="h-4 w-4" /> Terms of Service
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); navigate("/privacy"); }}
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        <Shield className="h-4 w-4" /> Privacy Policy
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMenuOpen(false); navigate("/settings/account"); }}
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                      >
                        <SettingsIcon className="h-4 w-4" /> Account Settings
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
                <NavLink
                  to={profilePath}
                  aria-label={`Open ${profile?.username ?? "your"} profile`}
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-secondary text-[11px] font-semibold uppercase text-muted-foreground ring-1 ring-border transition-colors hover:ring-primary"
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span>{(profile?.username ?? "?").slice(0, 1)}</span>
                  )}
                </NavLink>
              ) : (
                <Button asChild size="sm" variant="default">
                  <NavLink to="/auth"><LogIn className="mr-1.5 h-3.5 w-3.5" /> Sign in</NavLink>
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Desktop sidebar */}
        {!isSubmitReview && (
          <aside className="hidden w-64 shrink-0 md:block">
            <div className="sticky top-[72px] m-3 rounded-2xl border border-white/5 bg-card/60 p-3 shadow-[0_10px_40px_-20px_hsl(0_0%_0%/0.6)] backdrop-blur-xl">
              <nav className="flex flex-col gap-1">
                {items.map((item) => {
                  const to = item.to === "/me" ? profilePath : item.to;
                  const isAvatar = item.kind === "avatar";
                  return (
                    <NavLink
                      key={item.label}
                      to={to}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium tracking-wide transition-colors",
                          isActive
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className="relative inline-flex items-center justify-center">
                            {isAvatar ? (
                              <span
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-secondary text-[10px] font-semibold uppercase text-muted-foreground",
                                  isActive && "ring-2 ring-primary ring-offset-2 ring-offset-card",
                                )}
                              >
                                {profile?.avatar_url ? (
                                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <span>{(profile?.username ?? "?").slice(0, 1)}</span>
                                )}
                              </span>
                            ) : (
                              <item.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                            )}
                            {item.to === "/messages" && <UnreadBadge count={unread} />}
                            {item.soon && <SoonPill />}
                            {item.admin && (
                              <span className="absolute -right-1 -top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                          </span>
                          <span>{item.label}</span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </aside>
        )}

        {/* Main */}
        <main className={cn(
          "min-h-[calc(100vh-56px)] min-w-0 flex-1 overflow-x-hidden",
          isSubmitReview ? "pb-8" : "pb-24 md:pb-8",
          !isSubmitReview && pathname !== "/messages" && "xl:mx-auto xl:max-w-[620px]",
        )}>
          {children}
        </main>

        {/* Desktop right rail — search + top coaches */}
        {!isSubmitReview && pathname !== "/messages" && (
          <RightRail className="hidden lg:block" hideSearch={pathname === "/explore"} />
        )}
      </div>

      {/* Mobile floating pill nav */}
      <nav
        aria-label="Primary"
        className={cn(
          "fixed inset-x-0 bottom-4 z-40 mx-auto flex w-[min(92vw,360px)] items-center justify-around rounded-full border border-white/5 bg-background/70 px-2 py-2 shadow-[0_10px_40px_-10px_hsl(0_0%_0%/0.7)] backdrop-blur-xl md:hidden",
          (inOpenConversation || isSubmitReview) && "hidden",
        )}
      >
        {(() => {
          const mobileTabs = [
            { to: "/messages", label: "Messages", icon: MessageSquare, authOnly: true, kind: "icon" as const },
            { to: "/explore", label: "Search", icon: Search, end: true, kind: "icon" as const },
            { to: user ? profilePath : "/auth", label: "Profile", kind: "avatar" as const },
          ].filter((t) => !(t.authOnly && !user));

          return mobileTabs.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.kind === "icon" ? (tab as any).end : undefined}
              aria-label={tab.label}
              className={({ isActive }) =>
                cn(
                  "relative flex h-12 w-12 items-center justify-center rounded-full transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && tab.kind === "icon" && (
                    <span className="absolute inset-1 rounded-full bg-primary/15" aria-hidden />
                  )}
                  {tab.kind === "avatar" ? (
                    <span
                      className={cn(
                        "relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-secondary text-[10px] font-semibold uppercase text-muted-foreground",
                        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                    >
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{(profile?.username ?? "?").slice(0, 1)}</span>
                      )}
                    </span>
                  ) : (
                    <tab.icon className="relative h-[22px] w-[22px]" strokeWidth={1.75} />
                  )}
                  {tab.to === "/messages" && (
                    <span className="relative">
                      <UnreadBadge count={unread} />
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ));
        })()}
      </nav>
    </div>
  );
}

