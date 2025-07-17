-- Add additional_images column to blogs table
-- This column will store an array of image URLs as JSON

ALTER TABLE blogs 
ADD COLUMN additional_images TEXT[] DEFAULT '{}';

-- Add a comment to document the column
COMMENT ON COLUMN blogs.additional_images IS 'Array of additional image URLs for blog detail view';

-- Update existing rows to have an empty array instead of NULL
UPDATE blogs 
SET additional_images = '{}' 
WHERE additional_images IS NULL;

-- Make the column NOT NULL after setting default values
ALTER TABLE blogs 
ALTER COLUMN additional_images SET NOT NULL; 