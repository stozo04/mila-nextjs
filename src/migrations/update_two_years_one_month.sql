-- Update the "two-years-one-month" blog with additional images
-- Replace the image URLs below with your actual image URLs

UPDATE blogs 
SET additional_images = ARRAY[
  'https://your-domain.com/path/to/image1.jpg',
  'https://your-domain.com/path/to/image2.jpg'
]
WHERE slug = 'two-years-one-month';

-- Verify the update
SELECT slug, additional_images 
FROM blogs 
WHERE slug = 'two-years-one-month'; 