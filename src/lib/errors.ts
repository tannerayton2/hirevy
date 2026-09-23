const RAW_PATTERNS: RegExp[] = [
  /violates.*constraint/i,
  /duplicate key/i,
  /null value in column/i,
  /row-level security/i,
  /^PGRST/,
  /^\d{5}:/, // Postgres error codes like "23505: ..."
  /JWT/,
  /function .* does not exist/i,
];

/**
 * Turns a Supabase/Postgres/JS error into copy safe to show a user.
 * Most Supabase Auth error strings ("Invalid login credentials", "User
 * already registered", ...) are already human-readable and pass through;
 * database-internal messages (constraint names, PGRST codes, JWT errors)
 * are swapped for a generic, friendly fallback instead.
 */
export function friendlyErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  if (!raw) return fallback;
  if (RAW_PATTERNS.some((re) => re.test(raw))) return fallback;
  if (raw.length > 140) return fallback;
  return raw;
}
