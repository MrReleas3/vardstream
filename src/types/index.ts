export type UserRole = "user" | "admin";

export type MediaStatus = "plan_to_watch" | "watching" | "completed" | "dropped" | "paused";

export type MediaType = "movie" | "tv";

export interface UserPreferences {
  defaultSubtitleLang: string;
  autoPlayNext: boolean;
  theme: "dark" | "light" | "system";
}

export interface SimklTokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
}

export interface User {
  _id?: string;
  email: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  inviteCodeUsed?: string;
  preferences: UserPreferences;
  simklToken?: SimklTokenData | null;
  isDisabled: boolean;
  lastActiveAt?: string;
  createdAt: string;
}

export interface InviteCode {
  _id?: string;
  code: string;
  createdBy: string;
  usedBy?: string | null;
  status: "active" | "used" | "expired" | "revoked";
  expiresAt?: string | null;
  createdAt: string;
  usedAt?: string | null;
}

export interface PlaybackProgress {
  timestampSeconds: number;
  durationSeconds?: number;
  lastSeason?: number | null;
  lastEpisode?: number | null;
  episodeTimestampSeconds?: number | null;
}

export interface UserActivity {
  _id?: string;
  userId: string;
  mediaId: number;
  mediaType: MediaType;
  status: MediaStatus;
  isFavorite: boolean;
  rating?: number | null;
  progress: PlaybackProgress;
  updatedAt: string;
  createdAt: string;
  // Hydrated metadata for display:
  title?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
}

export interface ProviderUrlPatterns {
  movie?: string;
  tv?: string;
}

export interface Provider {
  _id?: string;
  name: string;
  slug: string;
  baseUrl: string;
  urlPatterns: ProviderUrlPatterns;
  supportedTypes: MediaType[];
  supportedQualities: string[];
  supportsSubtitles: boolean;
  subtitleLangs: string[];
  geoRestrictions: string[];
  isEnabled: boolean;
  priority: number;
  healthScore: number;
  failureCount24h: number;
  circuitBreakerTripped: boolean;
  lastCheckedAt?: string;
  createdAt: string;
}

export interface TelemetryLog {
  _id?: string;
  mediaId: number;
  mediaType: MediaType;
  providerSlug: string;
  reportType: "auto_switch" | "manual_report" | "load_timeout" | "onerror";
  reportedBy?: string;
  userAgent?: string;
  createdAt: string;
}

export interface StreamOption {
  provider: string;
  slug: string;
  url: string;
  health: number;
  qualities: string[];
  subtitles: boolean;
}

export interface MediaGenre {
  id: number;
  name: string;
}

export interface MediaDetail {
  tmdbId: number;
  imdbId?: string | null;
  title: string;
  originalTitle?: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate?: string;
  firstAirDate?: string;
  runtime?: number;
  episodeRunTime?: number[];
  numberOfSeasons?: number;
  numberOfEpisodes?: number;
  genres: MediaGenre[];
  voteAverage: number;
  voteCount?: number;
  status?: string;
  tagline?: string;
  mediaType: MediaType;
  seasons?: TVSeasonSummary[];
}

export interface TVSeasonSummary {
  id: number;
  seasonNumber: number;
  name: string;
  overview: string;
  episodeCount: number;
  posterPath: string | null;
  airDate?: string;
}

export interface TVEpisode {
  id: number;
  episodeNumber: number;
  seasonNumber: number;
  name: string;
  overview: string;
  stillPath: string | null;
  airDate?: string;
  voteAverage?: number;
  runtime?: number;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface AuthSessionUser {
  userId: string;
  email: string;
  username: string;
  role: UserRole;
}
