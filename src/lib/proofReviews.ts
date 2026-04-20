export const ENGAGEMENT_TYPES = [
  { value: "paid_offer", label: "Hired for a paid offer" },
  { value: "free_exchange", label: "Free exchange or testimonial trade" },
  { value: "consultation", label: "Consultation" },
  { value: "group_or_course", label: "Group coaching or course" },
  { value: "other", label: "Other" },
] as const;

export const AMOUNT_BRACKETS = [
  { value: "free", label: "$0 (free)" },
  { value: "under_500", label: "Under $500" },
  { value: "500_2500", label: "$500 – $2,500" },
  { value: "2500_10000", label: "$2,500 – $10,000" },
  { value: "10000_plus", label: "$10,000+" },
  { value: "prefer_not_say", label: "Prefer not to say" },
] as const;

export type EngagementType = typeof ENGAGEMENT_TYPES[number]["value"];
export type AmountBracket = typeof AMOUNT_BRACKETS[number]["value"];

export const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec",
];

export function engagementLabel(value: string): string {
  return ENGAGEMENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function amountLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return AMOUNT_BRACKETS.find((b) => b.value === value)?.label ?? null;
}

export function dateRangeLabel(
  startMonth: number,
  startYear: number,
  endMonth: number | null,
  endYear: number | null,
  ongoing: boolean,
): string {
  const start = `${MONTHS[startMonth - 1]} ${startYear}`;
  if (ongoing) return `${start} → Ongoing`;
  if (endMonth && endYear) return `${start} → ${MONTHS[endMonth - 1]} ${endYear}`;
  return start;
}

export const PROOF_BUCKET = "proof-documents";
export const PROOF_MAX_FILES = 5;
export const PROOF_MIN_FILES = 2;
export const PROOF_MAX_BYTES = 10 * 1024 * 1024; // 10MB
export const PROOF_ALLOWED_MIME = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif",
  "application/pdf",
];
