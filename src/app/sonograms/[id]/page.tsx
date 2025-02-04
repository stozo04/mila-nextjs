// src/app/sonograms/[id]/page.tsx (Server Component)
import SonogramDetailPage from "./SonogramDetail";

type SonogramDetailPageProps = {
  params: Promise<{ id: string }> | undefined;
};

export default async function ProductDetailsPage({ params }: SonogramDetailPageProps) {
  if (!params) {
    // Handle the case where params is undefined
    // For example, you could return a 404 page or redirect to a different route
    throw new Error("Params is undefined");
  }

  const resolvedParams = await params;
  const { id } = resolvedParams;

  return (
    <div>
      <SonogramDetailPage sonoId={id} />
    </div>
  );
}