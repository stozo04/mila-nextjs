"use client";
import { useState, useEffect, useRef } from "react";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import parse from 'html-react-parser';
import Loading from '@/app/loading';
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

const formatDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  return new Date(+year, +month - 1, +day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const BlogDetailPage = ({ slug }: { slug: string }) => {
  const [blog, setBlog] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load blog data
  useEffect(() => {
    const loadBlog = async () => {
      setIsLoading(true);
      const blogData = await fetchBlogData(slug);
      setBlog(blogData);
      setIsLoading(false);
    };
    loadBlog();
  }, [slug]);

  const handleListen = async () => {
    // If already generated, just play/pause
    if (audioUrl) {
      if (audioRef.current?.paused) {
        audioRef.current?.play();
      } else {
        audioRef.current?.pause();
      }
      return;
    }

    try {
      setIsAudioLoading(true);
      const res = await fetch(`/api/blog/${slug}/audio`);
      if (!res.ok) throw new Error("Failed to fetch audio");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      // Play once URL is set
      setTimeout(() => audioRef.current?.play(), 0);
    } catch (err) {
      console.error(err);
      alert("Sorry, unable to fetch audio.");
    } finally {
      setIsAudioLoading(false);
    }
  };

  if (isLoading) return <Loading />;
  if (!blog) return notFound();

  return (
    <div className="container mt-5">
      {/* Header with Listen control */}
      <div className="text-center mb-4">
        <div className="d-flex justify-content-between align-items-center" style={{ padding: '0 10%' }}>
          <h4>My Precious Mila,</h4>
          <div className="d-flex align-items-center gap-3">
            <strong>{formatDate(blog.date)}</strong>
            <button
              onClick={handleListen}
              disabled={isAudioLoading}
              className="btn btn-link"
            >
              {isAudioLoading ? 'Loading...' : '✨ Listen'}
            </button>
          </div>
        </div>
      </div>

      {/* Audio player (once loaded) */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          controls
          className="w-100 mb-4"
        />
      )}

      {/* Blog content */}
      <div className="blog-content mb-4">
        {parse(blog.content)}
      </div>

      <div className="mt-5" style={{ padding: '0 10%' }}>
        <strong>With all the love in the world,</strong>
        <p>Your Papa</p>
      </div>

      {/* Detail image + modal preview */}
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
                  onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
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
                />
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
};

export default BlogDetailPage;
