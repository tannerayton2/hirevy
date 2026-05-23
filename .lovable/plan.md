## Overview

Four interconnected changes spanning the profile page, messages, sidebar nav, and admin panel. A new `team_messages` table backs the HireVy Team chat thread and the admin Team Messages section.

---

## Change 1 — Other people's profile layout

File: `src/pages/Profile.tsx`

Restructure the `!isMe` profile header into this exact vertical order:

1. Avatar (centered, gold border) — already exists
2. Display name (centered, bold)
3. `@handle` (centered, muted)
4. Tier badge (centered)
5. Trust card (avg rating · reviews · trust pts)
6. Points progress line
7. Social icons row
8. Bio text
9. Action row: `Follow` + `Message` as outlined gold buttons (flex-1 each) + small square `MoreHorizontal` dots button
10. Full-width gold filled CTA: `✎ Leave a Review` → `/submit-review?coach={username}`

Dots dropdown items: **Share Profile**, **Report Profile** (red). Remove Edit Profile / Copy Review Link / Following / Settings / Log Out from this dropdown.

Own profile (`isMe`) layout is untouched.

---

## Change 2 — HireVy Team chat

### Database
New table `team_messages`:
- `id uuid pk`
- `user_id uuid not null` — the end-user side of the conversation
- `sender_id uuid not null` — who actually sent (user or admin)
- `from_admin boolean default false`
- `body text not null`
- `created_at timestamptz default now()`

RLS:
- User can SELECT rows where `user_id = auth.uid()`
- User can INSERT rows where `user_id = auth.uid()` and `sender_id = auth.uid()` and `from_admin = false`
- Admins can SELECT all, INSERT with `from_admin = true`

Add to realtime publication.

### Frontend
- `src/pages/Messages.tsx`: render a permanent pinned "HireVy Team" row at the top of the thread list with the HireVy logo avatar + small gold dot. Selecting it switches the right pane into a dedicated team-chat view (separate from the existing `t=<threadId>` flow). Use query param `?team=1`.
- New component `src/components/messages/TeamChatPane.tsx` containing the message list + composer that reads/writes `team_messages` for the current user.

---

## Change 3 — Sidebar menu item

File: `src/components/AppLayout.tsx`

In the own-profile right sidebar, add above **Log Out**:
- `Send us a message` with `MessageSquare` icon → navigates to `/messages?team=1`.

---

## Change 4 — Admin page restructure

File: `src/pages/Admin.tsx`

Wrap everything in card containers with bold headings + dividers. Sections in this order:

1. **Platform Stats** — existing block, moved to top.
2. **Moderation Queue** — tabs:
   - *Reported Profiles* — list from `profile_reports` (reporter handle, reported profile link, reason, timestamp, Dismiss / Warn buttons; Warn = no-op toast for now, Dismiss sets status='dismissed' — needs UPDATE policy, add via migration).
   - *Disputed Reviews* — empty state.
   - *Flagged Content* — empty state.
3. **Claim Requests** — pending first with Approve/Reject buttons (UPDATE policy needed on `claims_requests` for admins), resolved collapsed.
4. **Team Messages** — list all `team_messages` grouped by user with inline reply input.
5. **User Management** — existing table + search box + Ban User button (needs `is_banned boolean` column on profiles, admin UPDATE policy).
6. **Create Coach Profile** — existing.
7. **Manage Profiles** — existing.

### Additional migrations
- Add `is_banned boolean default false` to `profiles`.
- Admin UPDATE policy on `profile_reports` (status).
- Admin UPDATE policy on `claims_requests` (status, notes).
- Admin UPDATE policy on `profiles` for `is_banned` via security-definer RPC `admin_set_banned(p_user uuid, p_banned bool)`.

---

## Technical details

- New table and policies via one migration.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.team_messages;`
- Routing for Leave a Review uses existing `/submit-review` route with `?coach={username}` query string; `SubmitReview.tsx` should already accept or be lightly extended to read this — if not present, prefill via `useSearchParams`.
- Team chat avatar uses the existing `<Logo />` component inside an Avatar fallback.

---

## Out of scope

- No automated team-message responses.
- No changes to bottom nav, own-profile layout, other screens.
- Warn User and Flagged Content remain UI-only placeholders.
