"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion } from "framer-motion"
import { User, Lock, Save, Loader2, Mail, UserCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EnhancedInput } from "@/components/ui/enhanced-input"
import { ReadOnlyField } from "@/components/ui/read-only-field"
import { ProfilePictureUpload } from "@/components/ui/profile-picture-upload"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { profileSchema, passwordChangeSchema, type ProfileFormData, type PasswordChangeFormData } from "@/lib/validations"
import { updateProfileAction, changePasswordAction, uploadProfilePictureAction, removeProfilePictureAction } from "@/lib/actions"

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [pictureLoading, setPictureLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null)
  const [username, setUsername] = useState<string>("")

  // Profile form
  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
    },
  })

  // Password form
  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) throw error

        setUser(user)

        // Fetch additional user data from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('full_name, email, profile_picture_url, username')
          .eq('id', user.id)
          .single()

        if (userData) {
          profileForm.reset({
            full_name: userData.full_name || "",
            email: userData.email || user.email || "",
          })
          setProfilePictureUrl(userData.profile_picture_url)
          setUsername(userData.username || user.email?.split('@')[0] || "")
        } else {
          profileForm.reset({
            full_name: "",
            email: user.email || "",
          })
          setUsername(user.email?.split('@')[0] || "")
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        setMessage({ type: 'error', text: 'Failed to load profile data' })
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [profileForm])

  const onProfileSubmit = async (data: ProfileFormData) => {
    setProfileLoading(true)
    setMessage(null)

    try {
      const result = await updateProfileAction(data)
      if (result?.data?.success) {
        setMessage({ type: 'success', text: result.data.message })
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to update profile'
      })
    } finally {
      setProfileLoading(false)
    }
  }

  const onPasswordSubmit = async (data: PasswordChangeFormData) => {
    setPasswordLoading(true)
    setMessage(null)

    try {
      const result = await changePasswordAction(data)
      if (result?.data?.success) {
        setMessage({ type: 'success', text: result.data.message })
        passwordForm.reset()
      } else {
        throw new Error('Failed to change password')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to change password'
      })
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleProfilePictureChange = async (file: File | null) => {
    if (!file) return

    setPictureLoading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadProfilePictureAction(formData)
      if (result?.success) {
        setMessage({ type: 'success', text: result.message })
        setProfilePictureUrl(result.profilePictureUrl)
      } else {
        throw new Error('Failed to upload profile picture')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to upload profile picture'
      })
    } finally {
      setPictureLoading(false)
    }
  }

  const handleProfilePictureRemove = async () => {
    setPictureLoading(true)
    setMessage(null)

    try {
      const result = await removeProfilePictureAction({})
      if (result?.data?.success) {
        setMessage({ type: 'success', text: result.data.message })
        setProfilePictureUrl(null)
      } else {
        throw new Error('Failed to remove profile picture')
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to remove profile picture'
      })
    } finally {
      setPictureLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Profile Settings
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Manage your account information and security settings
        </p>
      </div>

      {/* Success/Error Message */}
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {message.text}
        </motion.div>
      )}

      <div className="space-y-6">
        {/* Profile Picture Section */}
        <Card className="shadow-sm border-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-gray-900 dark:text-white">
              Profile Picture
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              Upload and manage your profile picture
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfilePictureUpload
              currentImage={profilePictureUrl || undefined}
              onImageChange={handleProfilePictureChange}
              onImageRemove={handleProfilePictureRemove}
              userName={profileForm.watch("full_name") || username}
              size="lg"
            />
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="shadow-sm border-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-gray-900 dark:text-white">
              Account Information
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              Your account details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ReadOnlyField
                label="Username"
                value={username}
                icon={<UserCheck className="h-4 w-4" />}
                description="Your unique username cannot be changed"
              />

              <ReadOnlyField
                label="Email Address"
                value={profileForm.watch("email") || ""}
                icon={<Mail className="h-4 w-4" />}
                description="Your email address is used for account verification"
              />
            </div>

            <Separator className="my-6" />

            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
              <EnhancedInput
                label="Full Name"
                floatingLabel
                {...profileForm.register("full_name")}
                error={profileForm.formState.errors.full_name?.message}
              />

              <Button
                type="submit"
                disabled={profileLoading}
                className="w-full sm:w-auto"
              >
                {profileLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-sm border-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-medium text-gray-900 dark:text-white flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>Security Settings</span>
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
              <EnhancedInput
                label="Current Password"
                type="password"
                floatingLabel
                showPasswordToggle
                {...passwordForm.register("currentPassword")}
                error={passwordForm.formState.errors.currentPassword?.message}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <EnhancedInput
                  label="New Password"
                  type="password"
                  floatingLabel
                  showPasswordToggle
                  {...passwordForm.register("newPassword")}
                  error={passwordForm.formState.errors.newPassword?.message}
                />

                <EnhancedInput
                  label="Confirm New Password"
                  type="password"
                  floatingLabel
                  showPasswordToggle
                  {...passwordForm.register("confirmPassword")}
                  error={passwordForm.formState.errors.confirmPassword?.message}
                />
              </div>

              <Button
                type="submit"
                disabled={passwordLoading}
                className="w-full sm:w-auto"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Change Password
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
