// Script to add additional images to a blog
// Run this with: node src/scripts/add_images_to_blog.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function updateBlogWithImages() {
  try {
    // Replace these URLs with your actual image URLs
    const additionalImages = [
      'https://your-domain.com/path/to/image1.jpg',
      'https://your-domain.com/path/to/image2.jpg'
    ];

    const { data, error } = await supabase
      .from('blogs')
      .update({ 
        additional_images: additionalImages 
      })
      .eq('slug', 'two-years-one-month')
      .select();

    if (error) {
      console.error('Error updating blog:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('Successfully updated blog with additional images:', data[0]);
    } else {
      console.log('Blog not found or no rows updated');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check if blog exists first
async function checkBlogExists() {
  try {
    const { data, error } = await supabase
      .from('blogs')
      .select('*')
      .eq('slug', 'two-years-one-month')
      .single();

    if (error) {
      console.error('Error checking blog:', error);
      return false;
    }

    console.log('Blog found:', data);
    return true;
  } catch (error) {
    console.error('Error:', error);
    return false;
  }
}

async function main() {
  console.log('Checking if blog exists...');
  const exists = await checkBlogExists();
  
  if (exists) {
    console.log('Updating blog with additional images...');
    await updateBlogWithImages();
  } else {
    console.log('Blog "two-years-one-month" not found. Please create it first.');
  }
}

main(); 