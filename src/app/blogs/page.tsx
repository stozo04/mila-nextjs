"use client"; // Enable client-side interactivity

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Blog } from "@/types/blog";


const BlogsPage = () => {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [visibleCount, setVisibleCount] = useState(3);
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("All");

  useEffect(() => {
    fetchBlogs();
  }, [visibleCount, selectedYear]);

  const fetchBlogs = async () => {
    let query = supabase
      .from("blogs")
      .select("*")
      .order("date", { ascending: false })
      .limit(visibleCount);

    if (selectedYear !== "All") {
      query = query.eq("date", `${selectedYear}`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching blogs:", error);
    } else {
      setBlogs(data || []);
      extractYears(data || []);
    }
  };

  const extractYears = (blogsData: Blog[]) => {
    const yearsSet = new Set<string>();
    blogsData.forEach((blog) => {
      const year = new Date(blog.date).getFullYear().toString();
      yearsSet.add(year);
    });
    setYears(["All", ...Array.from(yearsSet)]);
  };

  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 3);
  };

  const handleFilterChange = (year: string) => {
    setSelectedYear(year);
    setVisibleCount(3); // Reset visible count when filtering
  };

  return (
    <div className="container mt-5">
      <h1 className="mb-4">Blogs</h1>

      {/* Filter by Year */}
      <div className="mb-4">
        <label htmlFor="yearFilter" className="form-label">
          Filter by Year:
        </label>
        <select
          id="yearFilter"
          className="form-select w-25"
          value={selectedYear}
          onChange={(e) => handleFilterChange(e.target.value)}
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {/* Blogs List */}
      <div className="row">
        {blogs.map((blog) => (
          <div key={blog.id} className="col-md-4 mb-4">
            <div className="card h-100">
              <Image
                src={blog.image_url}
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
                <Link href={`/blog/${blog.slug}`} className="mt-auto btn btn-primary">
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
    </div>
  );
};

export default BlogsPage;