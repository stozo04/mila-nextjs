import BlogDetailPage from "./BlogDetail";

type BlogDetailPageProps = {
  params: Promise<{ slug: string }> | undefined;
};

export default async function BlogDetailsPage({ params }: BlogDetailPageProps) {
  if (!params) {
    // Handle the case where params is undefined
    // For example, you could return a 404 page or redirect to a different route
    throw new Error("Params is undefined");
  }

  const resolvedParams = await params;
  const { slug } = resolvedParams;

  return (
    <div>
      <BlogDetailPage slug={slug} />
    </div>
  );
}