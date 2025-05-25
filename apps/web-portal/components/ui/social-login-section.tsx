import * as React from "react"
import { motion } from "framer-motion"
import { SocialLoginButton } from "./social-login-button"
import { GoogleIcon, MicrosoftIcon, LinkedInIcon } from "./social-icons"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"

export interface SocialLoginSectionProps {
  mode?: 'login' | 'signup'
  onError?: (error: string) => void
}

const SocialLoginSection: React.FC<SocialLoginSectionProps> = ({
  mode = 'login',
  onError
}) => {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null)

  const handleSocialLogin = async (provider: 'google' | 'azure' | 'linkedin_oidc') => {
    try {
      setLoadingProvider(provider)
      const supabase = createClient()

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        console.error(`${provider} login error:`, error)
        // Handle specific auth errors more gracefully
        if (error.message?.includes('refresh_token_not_found')) {
          onError?.('Session expired. Please try again.')
        } else {
          onError?.(error.message)
        }
      }
    } catch (error) {
      console.error(`${provider} login error:`, error)
      onError?.('An unexpected error occurred. Please try again.')
    } finally {
      setLoadingProvider(null)
    }
  }

  const actionText = mode === 'signup' ? 'Sign up' : 'Continue'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-200 dark:border-gray-700" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white dark:bg-gray-900 px-3 text-gray-400 dark:text-gray-500 font-normal tracking-wide uppercase">
            or {actionText.toLowerCase()} with
          </span>
        </div>
      </div>

      {/* Social Login Buttons - Single Column Layout */}
      <div className="space-y-3">
        <SocialLoginButton
          provider="google"
          loading={loadingProvider === 'google'}
          icon={<GoogleIcon />}
          onClick={() => handleSocialLogin('google')}
        >
          {actionText} with Google
        </SocialLoginButton>

        {/* Temporarily disabled for testing Google OAuth only */}
        {/* <SocialLoginButton
          provider="microsoft"
          loading={loadingProvider === 'azure'}
          icon={<MicrosoftIcon />}
          onClick={() => handleSocialLogin('azure')}
        >
          {actionText} with Microsoft
        </SocialLoginButton>

        <SocialLoginButton
          provider="linkedin"
          loading={loadingProvider === 'linkedin_oidc'}
          icon={<LinkedInIcon />}
          onClick={() => handleSocialLogin('linkedin_oidc')}
        >
          {actionText} with LinkedIn
        </SocialLoginButton> */}
      </div>
    </motion.div>
  )
}

export { SocialLoginSection }
