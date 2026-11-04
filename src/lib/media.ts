// Every photo lives in the private `mila_storage_bucket`. Components never build
// storage URLs themselves; they point <img>/<Image> at /api/media/<object path>,
// which checks the visitor's session and redirects to a short-lived signed URL.
// Use `unoptimized` on next/image for these: the image optimizer fetches the
// source server-side without the visitor's cookies, so it would only see a 401.
const BUCKET = 'mila_storage_bucket';
const LEGACY_PUBLIC_MARKER = `/storage/v1/object/public/${BUCKET}/`;

export const MEDIA_ROUTE = '/api/media/';

export function mediaUrl(objectPath: string): string {
  return MEDIA_ROUTE + objectPath.split('/').map(encodeURIComponent).join('/');
}

// `blogs.featured_image`, `detail_image` and `additional_images` hold the public
// URLs that were valid while the bucket was public. Map them to the media route
// at render time rather than rewriting rows; anything else passes through.
export function toMediaUrl<T extends string | null | undefined>(url: T): T | string {
  if (!url) return url;
  const at = url.indexOf(LEGACY_PUBLIC_MARKER);
  if (at < 0) return url;
  try {
    return mediaUrl(decodeURIComponent(url.slice(at + LEGACY_PUBLIC_MARKER.length)));
  } catch {
    return url;
  }
}
