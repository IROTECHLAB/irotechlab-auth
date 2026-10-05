import { z } from 'zod';

export const emailSchema = z.string().email().max(254).toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password is too long.')
  .regex(/[A-Z]/, 'Password must include an uppercase letter.')
  .regex(/[a-z]/, 'Password must include a lowercase letter.')
  .regex(/[0-9]/, 'Password must include a number.');

// ---- Image ----
// Accepts a valid data URI, null (explicit removal), or undefined (not sent).
const dataUriImage = z
  .union([
    z
      .string()
      .regex(
        /^data:image\/(png|jpeg|jpg|webp);base64,/,
        'Image must be PNG, JPEG, or WebP.'
      )
      .refine(
        (s) => Buffer.byteLength(s, 'utf8') <= 2 * 1024 * 1024,
        'Image must be under 2 MB.'
      ),
    z.null(),
  ])
  .optional();

export const avatarSchema = dataUriImage;

// ---- Nullable / optional strings ----
// Accepts string, "", null, or undefined. All three "empty-ish" values pass.
// Empties are left as-is so the PATCH handler can decide what to do with them.
const nullableString = (max: number, label: string) =>
  z
    .union([
      z.string().max(max, `${label} is too long.`),
      z.null(),
    ])
    .optional();

// ---- Nullable / optional URLs (empty string and null both allowed) ----
const nullableUrl = z
  .union([
    z.string().url('Must be a valid URL.'),
    z.literal(''),
    z.null(),
  ])
  .optional();

// ---- Signup / login ----
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().min(1, 'First name is required.').max(64),
  lastName: z.string().min(1, 'Last name is required.').max(64),
  avatar: avatarSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(64).optional(),
  lastName: z.string().min(1).max(64).optional(),
  avatar: avatarSchema,
});

// ---- Redirect URI ----
const absoluteUrl = z
  .string()
  .url('Must be a valid URL.')
  .refine((v) => {
    if (v.startsWith('https://')) return true;
    try {
      const u = new URL(v);
      if (u.protocol !== 'http:') return false;
      const host = u.hostname;
      return (
        host === 'localhost' ||
        host === '127.0.0.1' ||
        host === '::1' ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
      );
    } catch {
      return false;
    }
  }, 'Must use https:// (http://localhost allowed for development).');

// ---- App schemas ----
export const createAppSchema = z.object({
  name: z
    .string()
    .min(2, 'App name must be at least 2 characters.')
    .max(64, 'App name must be under 64 characters.'),
  description: nullableString(280, 'Description'),
  homepageUrl: nullableUrl,
  logo: avatarSchema,
  redirectUris: z
    .array(absoluteUrl)
    .min(1, 'Add at least one redirect URI.')
    .max(10, 'You can register up to 10 redirect URIs.'),
  allowedScopes: z
    .array(z.enum(['openid', 'profile', 'email']))
    .min(1, 'Select at least one scope.'),
  isPublic: z.boolean(),
});

export const updateAppSchema = z.object({
  name: z
    .string()
    .min(2, 'App name must be at least 2 characters.')
    .max(64, 'App name must be under 64 characters.')
    .optional(),
  description: nullableString(280, 'Description'),
  homepageUrl: nullableUrl,
  logo: avatarSchema,
  redirectUris: z.array(absoluteUrl).min(1).max(10).optional(),
  allowedScopes: z.array(z.enum(['openid', 'profile', 'email'])).min(1).optional(),
  isActive: z.boolean().optional(),
});
