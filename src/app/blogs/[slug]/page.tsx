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
      <h1 className="mb-4">{data.title}</h1>
      <p className="text-muted">
        {new Date(data.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      {/* <Image
        src={data.image_url}
        alt={data.title}
        width={800}
        height={500}
        className="mb-4"
        style={{ objectFit: "cover" }}
      /> */}
      <div className="blog-content">
        <Markdown>{data.content}</Markdown>
      </div>
    </div>
  );
};

export default BlogDetailPage;