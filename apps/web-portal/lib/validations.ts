import { z } from "zod"

// Profile validation schema
export const profileSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(100, "Full name must be less than 100 characters"),
  email: z.string().email("Invalid email address"),
})



// Password change validation schema
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// Document upload validation schema
export const documentUploadSchema = z.object({
  title: z.string().min(1, "Document title is required").max(200, "Title must be less than 200 characters"),
  description: z.string().optional(),
  file: z.any().refine((file) => file instanceof File, "File is required")
    .refine((file) => file.size <= 10 * 1024 * 1024, "File size must be less than 10MB")
    .refine(
      (file) => ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"].includes(file.type),
      "Only PDF, DOCX, and TXT files are allowed"
    ),
})

// CRM connection validation schema
export const crmConnectionSchema = z.object({
  crmType: z.enum(["salesforce", "hubspot"], {
    required_error: "Please select a CRM type",
  }),
})

// Subscription plan validation schema
export const subscriptionPlanSchema = z.object({
  planId: z.string().uuid("Invalid plan ID"),
  billingCycle: z.enum(["monthly", "annual"], {
    required_error: "Please select a billing cycle",
  }),
})

// Types derived from schemas
export type ProfileFormData = z.infer<typeof profileSchema>
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>
export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>
export type CrmConnectionFormData = z.infer<typeof crmConnectionSchema>
export type SubscriptionPlanFormData = z.infer<typeof subscriptionPlanSchema>
