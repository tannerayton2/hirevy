UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg','image/jpg','image/png','image/gif','image/webp','image/heic','image/heif',
    'audio/webm','audio/webm;codecs=opus',
    'audio/mp4','audio/x-m4a','audio/aac',
    'audio/mpeg',
    'audio/ogg','audio/ogg;codecs=opus',
    'audio/wav','audio/x-wav'
  ]
WHERE id = 'message-attachments';