"use server"

import { createSafeActionClient } from "next-safe-action"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"
import {
  profileSchema,
  passwordChangeSchema,
  documentUploadSchema,
  subscriptionPlanSchema
} from "./validations"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// Create safe action client
const action = createSafeActionClient()

// Update user profile action
export const updateProfileAction = action
  .schema(profileSchema)
  .action(async ({ parsedInput: { full_name, email } }) => {
    try {
      const supabase = createClient()
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Not authenticated")
      }

      // Update user profile in the users table
      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name,
          email,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      // If email changed, update auth email
      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email
        })

        if (emailError) {
          throw new Error(`Failed to update email: ${emailError.message}`)
        }
      }

      revalidatePath('/dashboard/profile')
      return { success: true, message: "Profile updated successfully" }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Failed to update profile")
    }
  })

// Change password action
export const changePasswordAction = action
  .schema(passwordChangeSchema)
  .action(async ({ parsedInput: { currentPassword, newPassword } }) => {
    try {
      const supabase = createClient()
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Not authenticated")
      }

      // Verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
      })

      if (verifyError) {
        throw new Error("Current password is incorrect")
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updateError) {
        throw new Error(`Failed to update password: ${updateError.message}`)
      }

      return { success: true, message: "Password changed successfully" }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Failed to change password")
    }
  })

// Upload profile picture action
export const uploadProfilePictureAction = async (formData: FormData) => {
  try {
    const supabase = createClient()
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error("Not authenticated")
    }

    // Extract file from FormData
    const file = formData.get('file') as File

    if (!file) {
      throw new Error("No file provided")
    }

    // Validate file
    if (!(file instanceof File)) {
      throw new Error("Invalid file format")
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size must be less than 5MB")
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Only JPG, PNG, and WebP files are allowed")
    }

    // Create unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}-${Date.now()}.${fileExt}`
    const filePath = `profile-pictures/${fileName}`

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Failed to upload image: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(filePath)

    // Update user profile with new picture URL
    const { error: updateError } = await supabase
      .from('users')
      .update({
        profile_picture_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      throw new Error(`Failed to update profile: ${updateError.message}`)
    }

    revalidatePath('/dashboard/profile')
    return { success: true, message: "Profile picture updated successfully", profilePictureUrl: publicUrl }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Failed to upload profile picture")
  }
}

// Remove profile picture action
export const removeProfilePictureAction = action
  .schema(z.object({}))
  .action(async () => {
    try {
      const supabase = createClient()
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Not authenticated")
      }

      // Update user profile to remove picture URL
      const { error: updateError } = await supabase
        .from('users')
        .update({
          profile_picture_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        throw new Error(`Failed to update profile: ${updateError.message}`)
      }

      revalidatePath('/dashboard/profile')
      return { success: true, message: "Profile picture removed successfully" }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Failed to remove profile picture")
    }
  })

// Delete document action
export const deleteDocumentAction = action
  .schema(z.object({ documentId: z.string() }))
  .action(async ({ parsedInput: { documentId } }) => {
    try {
      const supabase = createClient()
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Not authenticated")
      }

      // Delete document
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)
        .eq('user_id', user.id)

      if (deleteError) {
        throw new Error(`Failed to delete document: ${deleteError.message}`)
      }

      revalidatePath('/dashboard/knowledge')
      return { success: true, message: "Document deleted successfully" }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Failed to delete document")
    }
  })

// Disconnect CRM action
export const disconnectCrmAction = action
  .schema(z.object({ crmType: z.string() }))
  .action(async ({ parsedInput: { crmType } }) => {
    try {
      const supabase = createClient()
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        throw new Error("Not authenticated")
      }

      // This would typically call the backend API to disconnect CRM
      // For now, we'll simulate the action
      console.log(`Disconnecting ${crmType} for user ${user.id}`)

      revalidatePath('/dashboard/crm')
      return { success: true, message: `${crmType} disconnected successfully` }
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Failed to disconnect CRM")
    }
  })
