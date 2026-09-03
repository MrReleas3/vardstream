import { MediaType } from "@/types";
import { cacheGet, cacheSet } from "./redis";

export interface DirectStreamSubtitle {
  url: string;
  label: string;
  language: string;
}

export interface DirectStreamResult {
  success: boolean;
  provider?: string;
  isM3u8?: boolean;
  streamUrl?: string;
  rawStreamUrl?: string;
  headers?: Record<string, string>;
  subtitles?: DirectStreamSubtitle[];
  error?: string;
}

export interface FetchDirectStreamParams {
  tmdbId: number;
  mediaType: MediaType;
  season?: number;
  episode?: number;
  provider?: "autoembed" | "vidrock" | "vidfast" | string;
  bypassCache?: boolean;
}

export const NANO_API_DEFAULT_BASE_URL =
  process.env.NANO_API_URL ||
  process.env.NEXT_PUBLIC_NANO_API_URL ||
  "https://testingpys-nano-api.hf.space";

/**
 * Fetches the direct proxied M3U8/MP4 stream and WebVTT subtitles from the Nano Streaming API.
 */
export async function fetchDirectStream({
  tmdbId,
  mediaType,
  season = 1,
  episode = 1,
  provider,
  bypassCache = false,
}: FetchDirectStreamParams): Promise<DirectStreamResult> {
  const cacheKey = `direct_stream:${mediaType}:${tmdbId}:${mediaType === "tv" ? `s${season}e${episode}:` : ""}${provider || "auto"}`;

  if (!bypassCache) {
    const cached = await cacheGet<DirectStreamResult>(cacheKey);
    if (cached && cached.success && cached.streamUrl) {
      return cached;
    }
  }

  const baseUrl = (
    process.env.NANO_API_URL ||
    process.env.NEXT_PUBLIC_NANO_API_URL ||
    "https://testingpys-nano-api.hf.space"
  ).replace(/\/+$/, "");

  const query = new URLSearchParams({
    tmdb_id: String(tmdbId),
    type: mediaType,
  });

  if (mediaType === "tv") {
    query.set("season", String(season));
    query.set("episode", String(episode));
  }

  if (provider) {
    query.set("provider", provider);
  }

  const targetUrl = `${baseUrl}/extract?${query.toString()}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

  try {
    const res = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const json = await res.json();

    if (!res.ok || !json.success) {
      return {
        success: false,
        error: json.error || `Stream extraction returned HTTP status ${res.status}`,
        provider: json.provider,
      };
    }

    const result: DirectStreamResult = {
      success: true,
      provider: json.provider || "nano",
      isM3u8: json.is_m3u8 ?? true,
      streamUrl: json.stream_url,
      rawStreamUrl: json.raw_stream_url,
      headers: json.headers,
      subtitles: Array.isArray(json.subtitles)
        ? json.subtitles.map((sub: { url: string; label?: string; language?: string }) => ({
            url: sub.url,
            label: sub.label || sub.language || "Unknown",
            language: sub.language || "en",
          }))
        : [],
    };

    // Cache successful extractions for 10 minutes (600s)
    if (result.streamUrl) {
      await cacheSet(cacheKey, result, 600);
    }

    return result;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    const errorObj = err instanceof Error ? err : null;
    const isTimeout = errorObj?.name === "AbortError";
    const errorMessage = isTimeout
      ? "Nano API direct stream request timed out (12s)"
      : errorObj?.message || "Failed to reach Nano Streaming API";

    console.warn(`[Nano API Error] ${targetUrl}:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
