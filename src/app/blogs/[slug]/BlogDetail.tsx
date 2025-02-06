"use client";
import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import Markdown from "markdown-to-jsx";
import Loading from "../../loading";
import { Blog } from "@/types/blog";


const fetchBlogData = async (slug: string) => { 
    const { data, error } = await supabase
      .from("blogs")
      .select("*")
      .eq("slug", slug)
      .single();
  
    if (error) {
      console.error("Error fetching blogs:", error);
      return null;
    }
  
    return data;
  };

const BlogDetailPage = ({ slug }) => {
    const [blog, setBlog] = useState<Blog | null>(null);
    const [isLoading, setIsLoading] = useState(true);
   
    useEffect(() => {
      const loadBlog = async () => {
        setIsLoading(true);
        const blogData = await fetchBlogData(slug);
        setBlog(blogData);
        setIsLoading(false);
      };
  
      loadBlog();
    }, [slug]);
  
    if (isLoading) return <Loading />;
    if (!blog) return notFound();

    return (
<div className="container mt-5">
      <div className="text-center mb-4">
        <div className="d-flex justify-content-between align-items-center" style={{ padding: '0 10%' }}>
          <h4>My Precious Mila,</h4>
          <p className="text-muted">
            {new Date(blog.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="blog-content mb-4">
        <Markdown>{blog.content}</Markdown>
      </div>

      <div className="mt-5" style={{ padding: '0 10%' }}>
        <p>With all the love in the world,</p>
        <p>Your Papa</p>
      </div>
      
      {blog.detail_image && (
        <div className="blog-footer">
          <Image
            src={blog.detail_image}
            alt={blog.title}
            width={200}
            height={200}
            className="mb-4"
            style={{ objectFit: "cover" }}
          />
        </div>
      )}
    </div>
    );
}
export default BlogDetailPage;