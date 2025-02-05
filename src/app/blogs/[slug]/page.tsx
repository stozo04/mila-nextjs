import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from "next/image";
import React from "react";
import Markdown from "markdown-to-jsx";

type Props = {
    params: Promise<{ slug: string }> | undefined;
};


const BlogDetailPage = async ({ params }: Props) => {
if (!params) {
    // Handle the case where params is undefined
    // For example, you could return a 404 page or redirect to a different route
    throw new Error("Params is undefined");
    }
    const resolvedParams = await params;
    const { slug } = resolvedParams;

  const { data, error } = await supabase
    .from("blogs")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) {
    notFound();
  }

  return (
    <div className="container mt-5">
      <div className="d-flex justify-content-between align-items-center mb-4 blog-header">
        <h4>My Precious Mila,</h4>
        <h4 className="text-muted">
          {new Date(data.date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </h4>
      </div>

      <div className="blog-content mb-4">
        <Markdown>{data.content}</Markdown>
      </div>

      <div className="mt-5 blog-footer">
        <p>With all the love in the world,</p>
        <p>Your Papa</p>
      </div>
      {data.detail_image && (
        <div className="blog-footer">
          <Image
            src={data.detail_image}
            alt={data.title}
            width={200}
            height={200}
            className="mb-4"
            style={{ objectFit: "cover" }}
          />
        </div>
      )}
    </div>

    
  );
};

export default BlogDetailPage;