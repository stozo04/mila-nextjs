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
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3" style={{ padding: '0 5%' }}>
          <h4 className="mb-2 mb-md-0">My Precious Mila,</h4>
          <div className="d-flex align-items-center gap-3">
            <strong className="d-none d-md-inline">{formatDate(blog.date)}</strong>
            <button
              onClick={handleListen}
              disabled={isAudioLoading}
              className="listen-button"
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '20px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#4a5568',
                fontSize: '0.95rem',
                fontWeight: 500,
                backgroundColor: isAudioLoading ? '#f3f4f6' : '#f8fafc',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                whiteSpace: 'nowrap'
              }}
              onMouseOver={(e) => {
                if (!isAudioLoading) {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseOut={(e) => {
                if (!isAudioLoading) {
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {isAudioLoading ? (
                <>
                  <div className="loading-spinner" style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #e2e8f0',
                    borderTop: '2px solid #4a5568',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Loading...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5.14V19.14L19 12.14L8 5.14Z" fill="currentColor"/>
                  </svg>
                  Listen
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Audio player (once loaded) */}
      {audioUrl && (
        <div className="modern-audio-player" style={{
          maxWidth: '600px',
          margin: '0 auto 2rem',
          padding: '1rem',
          borderRadius: '12px',
          backgroundColor: '#f8fafc',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            className="custom-audio-player"
          />
        </div>
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

      {/* Add keyframes for loading spinner and audio player styles */}
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .custom-audio-player {
          width: 100%;
          height: 40px;
          border-radius: 8px;
          background-color: transparent;
        }

        .custom-audio-player::-webkit-media-controls-panel {
          background-color: transparent;
        }

        .custom-audio-player::-webkit-media-controls-current-time-display,
        .custom-audio-player::-webkit-media-controls-time-remaining-display {
          color: #4a5568;
        }
      `}</style>
    </div>
  );
};

export default BlogDetailPage;
