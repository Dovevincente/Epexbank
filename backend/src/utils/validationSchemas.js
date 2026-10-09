import { z } from "zod";

const passwordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password cannot exceed 128 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain a special character",
  );

export const registerSchema = z.object({
  body: z.object({
    firstName: z
      .string()
      .trim()
      .min(2)
      .max(50),

    lastName: z
      .string()
      .trim()
      .min(2)
      .max(50),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(254),

    phone: z
      .string()
      .trim()
      .min(7)
      .max(30)
      .optional()
      .or(z.literal("")),

    password: passwordSchema,

    country: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .optional()
      .or(z.literal("")),
  }),

  params: z.object({}),

  query: z.object({}),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email(),

    password: z
      .string()
      .min(1)
      .max(128),
  }),

  params: z.object({}),

  query: z.object({}),
});

export const refreshSchema = z.object({
  body: z.object({}),

  params: z.object({}),

  query: z.object({}),
});