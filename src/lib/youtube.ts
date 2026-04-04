const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
]);

const YOUTUBE_EMBED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
]);

function isYoutubeHost(hostname: string) {
  return YOUTUBE_HOSTS.has(hostname.toLowerCase());
}

function isYoutubeEmbedHost(hostname: string) {
  return YOUTUBE_EMBED_HOSTS.has(hostname.toLowerCase());
}

function extractVideoId(url: URL) {
  const hostname = url.hostname.toLowerCase();
  const pathSegments = url.pathname.split("/").filter(Boolean);

  if (hostname === "youtu.be" || hostname === "www.youtu.be") {
    return pathSegments[0] ?? null;
  }

  if (!isYoutubeHost(hostname) && !isYoutubeEmbedHost(hostname)) {
    return null;
  }

  if (pathSegments[0] === "watch") {
    return url.searchParams.get("v");
  }

  if (pathSegments[0] === "shorts" || pathSegments[0] === "embed" || pathSegments[0] === "live") {
    return pathSegments[1] ?? null;
  }

  return url.searchParams.get("v");
}

export function normalizeYoutubeUrl(rawUrl?: string | null) {
  if (!rawUrl) {
    return null;
  }

  const trimmedUrl = rawUrl.trim();
  if (!trimmedUrl) {
    return null;
  }

  try {
    const url = new URL(trimmedUrl);
    const videoId = extractVideoId(url);

    if (!videoId) {
      return null;
    }

    const embedUrl = new URL(`https://www.youtube.com/embed/${videoId}`);
    const start = url.searchParams.get("t") ?? url.searchParams.get("start");

    if (start) {
      embedUrl.searchParams.set("start", start.replace(/s$/i, ""));
    }

    return embedUrl.toString();
  } catch {
    return null;
  }
}
