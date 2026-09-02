import { z } from "zod";

export const RegisterSchema = z.object({
  email: z.string().email("Invalid email address"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, dashes, and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  inviteCode: z.string().min(4, "Invite code is required").max(32),
});

export const LoginSchema = z.object({
  emailOrUsername: z.string().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(10, "A valid reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});

export const UpdatePreferencesSchema = z.object({
  defaultSubtitleLang: z.string().optional(),
  autoPlayNext: z.boolean().optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
});

export const UpsertActivitySchema = z.object({
  status: z.enum(["plan_to_watch", "watching", "completed", "dropped", "paused"]).optional(),
  isFavorite: z.boolean().optional(),
  rating: z.number().min(1).max(10).nullable().optional(),
  progress: z
    .object({
      timestampSeconds: z.number().nonnegative(),
      durationSeconds: z.number().nonnegative().optional(),
      lastSeason: z.number().int().positive().nullable().optional(),
      lastEpisode: z.number().int().positive().nullable().optional(),
      episodeTimestampSeconds: z.number().nonnegative().nullable().optional(),
    })
    .optional(),
});

export const EmbedFailureSchema = z.object({
  mediaId: z.number().int().positive(),
  mediaType: z.enum(["movie", "tv"]),
  providerSlug: z.string().min(1),
  reportType: z.enum(["auto_switch", "manual_report", "load_timeout", "onerror"]),
  userAgent: z.string().optional(),
});

export const CreateInviteCodesSchema = z.object({
  count: z.number().int().min(1).max(50).default(1),
  expiresInDays: z.number().int().positive().nullable().optional(),
});

export const UpdateUserStatusSchema = z.object({
  isDisabled: z.boolean(),
});

export const ProviderSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric and hyphens"),
  baseUrl: z.string().url("Must be a valid URL"),
  urlPatterns: z.object({
    movie: z.string().optional(),
    tv: z.string().optional(),
  }),
  supportedTypes: z.array(z.enum(["movie", "tv"])).min(1),
  supportedQualities: z.array(z.string()).default(["720p", "1080p"]),
  supportsSubtitles: z.boolean().default(true),
  subtitleLangs: z.array(z.string()).default(["en"]),
  geoRestrictions: z.array(z.string()).default([]),
  isEnabled: z.boolean().default(true),
  priority: z.number().int().min(1).default(1),
});

export const UpdateProviderSchema = ProviderSchema.partial();
