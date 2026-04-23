-- Wipe existing test rows (per spec — they were test data)
DELETE FROM public.imported_testimonials;

-- Drop old columns
ALTER TABLE public.imported_testimonials
  DROP COLUMN IF EXISTS reviewer_name,
  DROP COLUMN IF EXISTS testimonial_text,
  DROP COLUMN IF EXISTS date_label,
  DROP COLUMN IF EXISTS source_label,
  DROP COLUMN IF EXISTS source_screenshot_url;

-- Add new columns
ALTER TABLE public.imported_testimonials
  ADD COLUMN caption text NOT NULL,
  ADD COLUMN media_type text NOT NULL,
  ADD COLUMN photo_url text,
  ADD COLUMN video_url text;

-- Constraints
ALTER TABLE public.imported_testimonials
  ADD CONSTRAINT imported_testimonials_caption_length_chk
    CHECK (length(caption) BETWEEN 1 AND 200),
  ADD CONSTRAINT imported_testimonials_media_type_chk
    CHECK (media_type IN ('photo', 'video')),
  ADD CONSTRAINT imported_testimonials_media_consistency_chk
    CHECK (
      (media_type = 'photo' AND photo_url IS NOT NULL AND video_url IS NULL)
      OR
      (media_type = 'video' AND video_url IS NOT NULL AND photo_url IS NULL)
    );