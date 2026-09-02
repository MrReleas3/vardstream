import { MediaType, Provider, StreamOption } from "@/types";
import { getCollection, getMemoryCollection } from "./db";

export const DEFAULT_PROVIDERS: Provider[] = [
  {
    name: "VidSrc",
    slug: "vidsrc",
    baseUrl: "https://vidsrc.to/embed",
    urlPatterns: {
      movie: "/movie/{tmdbId}",
      tv: "/tv/{tmdbId}/{season}/{episode}",
    },
    supportedTypes: ["movie", "tv"],
    supportedQualities: ["720p", "1080p"],
    supportsSubtitles: true,
    subtitleLangs: ["en", "es", "fr"],
    geoRestrictions: [],
    isEnabled: true,
    priority: 1,
    healthScore: 98,
    failureCount24h: 2,
    circuitBreakerTripped: false,
    createdAt: new Date().toISOString(),
  },
  {
    name: "SuperEmbed",
    slug: "superembed",
    baseUrl: "https://multiembed.mov",
    urlPatterns: {
      movie: "/?video_id={tmdbId}&tmdb=1",
      tv: "/?video_id={tmdbId}&tmdb=1&s={season}&e={episode}",
    },
    supportedTypes: ["movie", "tv"],
    supportedQualities: ["720p", "1080p"],
    supportsSubtitles: true,
    subtitleLangs: ["en"],
    geoRestrictions: [],
    isEnabled: true,
    priority: 2,
    healthScore: 92,
    failureCount24h: 5,
    circuitBreakerTripped: false,
    createdAt: new Date().toISOString(),
  },
  {
    name: "AutoEmbed",
    slug: "autoembed",
    baseUrl: "https://player.autoembed.cc/embed",
    urlPatterns: {
      movie: "/movie/{tmdbId}",
      tv: "/tv/{tmdbId}/{season}/{episode}",
    },
    supportedTypes: ["movie", "tv"],
    supportedQualities: ["720p"],
    supportsSubtitles: false,
    subtitleLangs: [],
    geoRestrictions: [],
    isEnabled: true,
    priority: 3,
    healthScore: 85,
    failureCount24h: 12,
    circuitBreakerTripped: false,
    createdAt: new Date().toISOString(),
  },
  {
    name: "2Embed",
    slug: "2embed",
    baseUrl: "https://www.2embed.cc",
    urlPatterns: {
      movie: "/embed/{tmdbId}",
      tv: "/embedtv/{tmdbId}&s={season}&e={episode}",
    },
    supportedTypes: ["movie", "tv"],
    supportedQualities: ["720p", "1080p"],
    supportsSubtitles: true,
    subtitleLangs: ["en"],
    geoRestrictions: [],
    isEnabled: true,
    priority: 4,
    healthScore: 80,
    failureCount24h: 18,
    circuitBreakerTripped: false,
    createdAt: new Date().toISOString(),
  },
];

export function buildEmbedUrl(
  provider: Provider,
  mediaType: MediaType,
  tmdbId: number,
  season?: number,
  episode?: number
): string | null {
  const pattern = provider.urlPatterns[mediaType];
  if (!pattern) return null;

  const s = season ?? 1;
  const e = episode ?? 1;

  const path = pattern
    .replace(/{tmdbId}/g, String(tmdbId))
    .replace(/{season}/g, String(s))
    .replace(/{episode}/g, String(e));

  return `${provider.baseUrl}${path}`;
}

export async function getActiveProviders(): Promise<Provider[]> {
  const col = await getCollection<Provider>("providers");
  if (col) {
    const list = await col
      .find({ isEnabled: true, circuitBreakerTripped: false })
      .sort({ healthScore: -1, priority: 1 })
      .toArray();

    if (list.length > 0) return list;
  }

  // Check memory DB
  const memoryList = getMemoryCollection<Provider>("providers");
  if (memoryList.length > 0) {
    return memoryList
      .filter((p) => p.isEnabled && !p.circuitBreakerTripped)
      .sort((a, b) => b.healthScore - a.healthScore || a.priority - b.priority);
  }

  // Fallback defaults
  return DEFAULT_PROVIDERS.filter((p) => p.isEnabled && !p.circuitBreakerTripped).sort(
    (a, b) => b.healthScore - a.healthScore || a.priority - b.priority
  );
}

export async function resolveStreamOptions(
  mediaType: MediaType,
  tmdbId: number,
  season?: number,
  episode?: number
): Promise<StreamOption[]> {
  const providers = await getActiveProviders();

  const streams: StreamOption[] = [];

  for (const provider of providers) {
    if (!provider.supportedTypes.includes(mediaType)) continue;

    const url = buildEmbedUrl(provider, mediaType, tmdbId, season, episode);
    if (url) {
      streams.push({
        provider: provider.name,
        slug: provider.slug,
        url,
        health: provider.healthScore,
        qualities: provider.supportedQualities,
        subtitles: provider.supportsSubtitles,
      });
    }
  }

  return streams;
}
