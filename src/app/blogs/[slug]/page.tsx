import { marked } from "marked";
import { supabase } from "@/lib/supabase";

export default async function BlogPage({ params }: { params: { slug: string } }) {
  const { slug } = params;

  // Fetch the blog based on the slug
  const { data: blog, error } = await supabase
    .from("blogs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!blog || error) return <p>Blog not found.</p>;

  const blogHtml = marked(blog.content); // Convert Markdown to HTML

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold">{blog.title}</h1>
      <p className="text-gray-500">{new Date(blog.created_at).toDateString()}</p>
      <div dangerouslySetInnerHTML={{ __html: blogHtml }} className="mt-4 prose lg:prose-lg" />
    </main>
  );
}
