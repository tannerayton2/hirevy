-- Imported testimonials table
CREATE TABLE public.imported_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name text NOT NULL,
  testimonial_text text NOT NULL,
  date_label text NOT NULL,
  source_label text NOT NULL,
  source_screenshot_url text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT imported_testimonials_reviewer_name_len CHECK (char_length(reviewer_name) BETWEEN 1 AND 80),
  CONSTRAINT imported_testimonials_text_len CHECK (char_length(testimonial_text) BETWEEN 1 AND 2000),
  CONSTRAINT imported_testimonials_date_len CHECK (char_length(date_label) BETWEEN 1 AND 40),
  CONSTRAINT imported_testimonials_source_len CHECK (char_length(source_label) BETWEEN 1 AND 60)
);

CREATE INDEX idx_imported_testimonials_provider ON public.imported_testimonials(provider_user_id, created_at DESC);

ALTER TABLE public.imported_testimonials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Imported testimonials are viewable by everyone"
  ON public.imported_testimonials FOR SELECT USING (true);

CREATE POLICY "Provider can insert their own imported testimonials"
  ON public.imported_testimonials FOR INSERT
  WITH CHECK (auth.uid() = provider_user_id);

CREATE POLICY "Provider can update their own imported testimonials"
  ON public.imported_testimonials FOR UPDATE
  USING (auth.uid() = provider_user_id)
  WITH CHECK (auth.uid() = provider_user_id);

CREATE POLICY "Provider can delete their own imported testimonials"
  ON public.imported_testimonials FOR DELETE
  USING (auth.uid() = provider_user_id);

-- updated_at trigger (reuse existing set_updated_at)
CREATE TRIGGER imported_testimonials_set_updated_at
  BEFORE UPDATE ON public.imported_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Private storage bucket for source screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('imported-testimonial-sources', 'imported-testimonial-sources', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: provider (folder = their uid) can read/write own files; admins can read
CREATE POLICY "Provider can read own imported testimonial sources"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'imported-testimonial-sources'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin(auth.uid()))
  );

CREATE POLICY "Provider can upload own imported testimonial sources"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'imported-testimonial-sources'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Provider can update own imported testimonial sources"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'imported-testimonial-sources'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Provider can delete own imported testimonial sources"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'imported-testimonial-sources'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );