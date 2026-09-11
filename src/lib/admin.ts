// Admin allowlist — add usernames here to grant /admin access.
// Must match the SQL allowlist in the `is_admin()` function.
export const ADMIN_USERNAMES = ["aytontanner"] as const;

export function isAdminUsername(username: string | null | undefined): boolean {
  if (!username) return false;
  return (ADMIN_USERNAMES as readonly string[]).includes(username);
}
