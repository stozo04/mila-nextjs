"use client";
import { useState, useEffect } from "react";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import parse from 'html-react-parser';
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
const formatDate = (dateString) => {
  const [year, month, day] = dateString.split('-');
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const BlogDetailPage = ({ slug }) => {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
          <strong>{formatDate(blog.date)}</strong>
        </div>
      </div>

      <div className="blog-content mb-4">
        {parse(blog.content)}
      </div>

      <div className="mt-5" style={{ padding: '0 10%' }}>
        <strong>With all the love in the world,</strong>
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
            style={{ objectFit: "cover", cursor: "pointer" }}
            onClick={() => setSelectedImage(blog.detail_image)}
          />
        </div>
      )}

       {/* Image Preview Modal */}
       {selectedImage && (
                <div
                    className="modal fade show d-block"
                    style={{
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(5px)',
                        transition: 'all 0.3s ease-in-out'
                    }}
                    onClick={() => setSelectedImage(null)}
                >
                    <div 
                        className="modal-dialog modal-dialog-centered modal-lg"
                        style={{
                            transform: 'scale(1)',
                            opacity: 1,
                            animation: 'modalPop 0.3s ease-out'
                        }}
                    >
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-body p-0 position-relative">
                                <button
                                    type="button"
                                    className="btn-close position-absolute top-0 end-0 m-3 p-2"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedImage(null);
                                    }}
                                    style={{
                                        backgroundColor: 'white',
                                        borderRadius: '50%',
                                        padding: '0.5rem',
                                        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                        zIndex: 1,
                                        opacity: 0.8,
                                        transition: 'opacity 0.2s ease'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                                    onMouseOut={(e) => e.currentTarget.style.opacity = '0.8'}
                                ></button>
                                <Image
                                    src={selectedImage}
                                    alt="Preview"
                                    width={800}
                                    height={600}
                                    className="img-fluid rounded"
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        objectFit: 'contain',
                                        maxHeight: '80vh'
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
    </div>
  );
}
export default BlogDetailPage;