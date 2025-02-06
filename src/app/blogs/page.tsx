"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Blog } from "@/types/blog";
import Loading from "../loading";


const BlogsPage = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(3);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchBlogs();
  }, [visibleCount, selectedTag, searchQuery]);

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
      extractTags(data || []);
    }
    
    setIsLoading(false);
  };

  const extractTags = (blogsData: Blog[]) => {
    const tagsSet = new Set<string>();
    blogsData.forEach((blog) => {
      if (blog.tag) {
        tagsSet.add(blog.tag);
      }
    });
    setTags(["All", ...Array.from(tagsSet)]);
  };

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 3);
  };

  const handleFilterChange = (tag: string) => {
    setSelectedTag(tag);
    setVisibleCount(3); // Reset visible count when filtering
  };

  return (
    <div className="container mt-5">
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            {/* Tag Filter Pills */}
            <div className="d-flex gap-2">
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
                  {tag} {tag === 'All' ? `(${blogs.length})` : `(${blogs.filter(blog => blog.tag === tag).length})`}
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
              <button className="btn btn-secondary" onClick={handleShowMore}>
                Show More
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BlogsPage;