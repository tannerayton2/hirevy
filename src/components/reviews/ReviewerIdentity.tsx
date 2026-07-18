import { Link } from "react-router-dom";

interface Props {
  reviewerName: string;
  userId?: string | null;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  size?: "sm" | "md";
  onNavigate?: () => void;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

export function ReviewerIdentity({
  reviewerName,
  userId,
  username,
  displayName,
  avatarUrl,
  size = "sm",
  onNavigate,
}: Props) {
  const avatarSize = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const nameSize = size === "md" ? "text-sm" : "text-[13px]";
  const handleSize = size === "md" ? "text-xs" : "text-[11px]";
  const linked = !!(userId && username);
  const shownName = displayName || reviewerName;

  const avatar = (
    <div
      className={`${avatarSize} shrink-0 overflow-hidden rounded-full bg-muted ring-1 ring-border`}
      aria-hidden
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[11px] font-semibold text-muted-foreground">
          {initials(shownName)}
        </div>
      )}
    </div>
  );

  const body = (
    <div className="min-w-0 leading-tight">
      <p className={`truncate font-semibold text-foreground ${nameSize}`}>{shownName}</p>
      {linked ? (
        <p className={`truncate text-primary ${handleSize}`}>@{username}</p>
      ) : (
        <p className={`truncate text-muted-foreground ${handleSize}`}>Unlinked reviewer</p>
      )}
    </div>
  );

  if (linked) {
    return (
      <Link
        to={`/@${username}`}
        onClick={(e) => {
          e.stopPropagation();
          onNavigate?.();
        }}
        className="group flex min-w-0 items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        {avatar}
        <div className="min-w-0 leading-tight">
          <p className={`truncate font-semibold text-foreground group-hover:underline ${nameSize}`}>{shownName}</p>
          <p className={`truncate text-primary ${handleSize}`}>@{username}</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      {avatar}
      {body}
    </div>
  );
}
