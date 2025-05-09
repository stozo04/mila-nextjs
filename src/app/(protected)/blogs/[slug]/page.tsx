// src/app/(protected)/blogs/[slug]/page.tsx
import BlogDetailPage from "./BlogDetail";

type BlogDetailPageProps = {
  params: Promise<{ slug: string }> | undefined;
};

export default async function BlogDetailsPage({
  params,
}: BlogDetailPageProps) {
  if (!params) {
    throw new Error("Params is undefined");
  }
  const { slug } = await params;
  return (
    <div>
      <BlogDetailPage slug={slug} />
    </div>
  );
}
