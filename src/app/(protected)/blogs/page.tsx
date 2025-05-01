"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { createBrowserClient } from '@supabase/ssr';
import { Blog } from "@/types/blog";
import Loading from '@/app/loading';
import CreateBlogModal from "@/components/Blog/CreateBlogModal";

const BlogsPage = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Initialize the Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchBlogs();
    fetchAllTags();
    // Get the current user's session
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, [visibleCount, selectedTag, searchQuery]);

  const fetchAllTags = async () => {
    const { data: tagsData, error } = await supabase
      .from("blogs")
      .select('tag')
      .not('tag', 'is', null);

    if (error) {
      console.error("Error fetching tags:", error);
      return;
    }

    // Get unique tags and their counts
    const tagCountMap: Record<string, number> = {};
    tagsData.forEach((blog) => {
      if (blog.tag) {
        tagCountMap[blog.tag] = (tagCountMap[blog.tag] || 0) + 1;
      }
    });

    setTags(["All", ...Object.keys(tagCountMap)]);
    setTagCounts(tagCountMap);
  };

  const fetchBlogs = async () => {
    setIsLoading(true);    
    // Artificial delay for testing - Comment to test loading state
    //  await new Promise(resolve => setTimeout(resolve, 2000));

    let query = supabase
      .from("blogs")
      .select("*")
      .order("date", { ascending: false });

    if (selectedTag !== "All") {
      query = query.eq("tag", selectedTag);
    }

    if (searchQuery) {
      query = query.ilike("title", `%${searchQuery}%`);
    }

    query = query.limit(visibleCount);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching blogs:", error);
    } else {
      setBlogs(data || []);
    }
    
    setIsLoading(false);
  };

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 3);
  };

  const handleFilterChange = (tag: string) => {
    setSelectedTag(tag);
    setVisibleCount(3); // Reset visible count when filtering
  };

  const handleBlogCreated = (newBlog: Blog) => {
    setBlogs([newBlog, ...blogs]);
    fetchAllTags(); // Refresh tags in case a new tag was added
  };

  return (
    <div className="container mt-5">
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex gap-2 align-items-center">
              {/* Create Blog Button - Only show for specific user */}
              {user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                <button
                  className="btn btn-success rounded-pill me-3"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create Blog
                </button>
              )}
              
              {/* Tag Filter Pills */}
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => handleFilterChange(tag)}
                  className={`btn rounded-pill px-3 ${
                    selectedTag === tag 
                    ? 'btn-primary' 
                    : 'btn-outline-primary'
                  }`}
                >
                  {tag} {tag === 'All' ? `(${tagCounts['All'] || 0})` : `(${tagCounts[tag] || 0})`}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="col-md-3">
              <input
                type="search"
                className="form-control rounded-pill"
                placeholder="Search by title"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Create Blog Modal */}
          <CreateBlogModal
            show={showCreateModal}
            onHide={() => setShowCreateModal(false)}
            onBlogCreated={handleBlogCreated}
          />

          {/* Blogs List */}
          <div className="row">
            {blogs.map((blog) => (
              <div key={blog.id} className="col-md-4 mb-4">
                <div className="card h-100">
                  <Image
                    src={blog.featured_image}
                    alt={blog.title}
                    width={400}
                    height={250}
                    className="card-img-top"
                    style={{ objectFit: "cover" }}
                  />
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{blog.title}</h5>
                    <p className="card-text text-muted">
                      {new Date(blog.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <Link href={`/blogs/${blog.slug}`} className="mt-auto btn btn-primary">
                      Read More
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show More Button */}
          {blogs.length >= visibleCount && (
            <div className="text-center mt-4">
              <button 
                className="btn btn-outline-primary rounded-pill px-4"
                onClick={handleShowMore}
                onMouseUp={(e) => e.currentTarget.blur()}
              >
                View More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BlogsPage;