import { z } from 'zod';

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Email is invalid' }).max(255, 'Email must be at most 255 characters'));

export const registerSchema = z.object({
  email,
  // bcrypt only uses the first 72 bytes of a password; longer ones would be silently cut.
  password: z
    .string({ error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .refine((value) => Buffer.byteLength(value) <= 72, 'Password must be at most 72 bytes'),
});

// Login does not repeat the registration rules: a wrong password is just "invalid credentials".
export const loginSchema = z.object({
  email,
  password: z.string({ error: 'Password is required' }).min(1, 'Password is required'),
});

export type Credentials = z.infer<typeof registerSchema>;
