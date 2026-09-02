-- Update the "two-years-one-month" blog with additional images
-- Replace the image URLs with your actual image URLs

UPDATE blogs 
SET additional_images = ARRAY[
  'https://your-domain.com/path/to/image1.jpg',
  'https://your-domain.com/path/to/image2.jpg'
]
WHERE slug = 'two-years-one-month';

-- Example with placeholder URLs (replace with your actual image URLs):
-- UPDATE blogs 
-- SET additional_images = ARRAY[
--   '/images/blogs/two-years-one-month/image1.jpg',
--   '/images/blogs/two-years-one-month/image2.jpg'
-- ]
-- WHERE slug = 'two-years-one-month'; 