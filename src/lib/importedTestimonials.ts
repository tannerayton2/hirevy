export const IMPORTED_SOURCE_PRESETS = [
  "Instagram DM",
  "Email from client",
  "Client website post",
  "Loom testimonial",
  "Text message",
  "Phone call notes",
  "LinkedIn message",
  "Other",
] as const;

export type ImportedSourcePreset = (typeof IMPORTED_SOURCE_PRESETS)[number];

export interface ImportedTestimonial {
  id: string;
  provider_user_id: string;
  reviewer_name: string;
  testimonial_text: string;
  date_label: string;
  source_label: string;
  source_screenshot_url: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}
