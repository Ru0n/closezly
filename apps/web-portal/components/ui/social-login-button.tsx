import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export interface SocialLoginButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  provider: 'google' | 'microsoft' | 'linkedin' | 'github'
  loading?: boolean
  icon?: React.ReactNode
}

const providerConfig = {
  google: {
    name: 'Google',
    bgColor: 'bg-white hover:bg-gray-50/80',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    shadowColor: 'hover:shadow-sm',
  },
  microsoft: {
    name: 'Microsoft',
    bgColor: 'bg-white hover:bg-blue-50/50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    shadowColor: 'hover:shadow-sm',
  },
  linkedin: {
    name: 'LinkedIn',
    bgColor: 'bg-white hover:bg-blue-50/50',
    textColor: 'text-gray-700',
    borderColor: 'border-gray-200',
    shadowColor: 'hover:shadow-sm',
  },
}

const SocialLoginButton = React.forwardRef<HTMLButtonElement, SocialLoginButtonProps>(
  ({ className, provider, loading, icon, children, ...props }, ref) => {
    const config = providerConfig[provider]

    return (
      <motion.div
        whileHover={{ scale: 1.005, y: -1 }}
        whileTap={{ scale: 0.995 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
      >
        <Button
          ref={ref}
          variant="outline"
          className={cn(
            "w-full h-11 text-sm font-normal transition-all duration-200",
            "border shadow-none rounded-lg",
            config.bgColor,
            config.textColor,
            config.borderColor,
            config.shadowColor,
            "focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300",
            loading && "opacity-60 cursor-not-allowed",
            className
          )}
          disabled={loading}
          {...props}
        >
          <div className="flex items-center justify-center space-x-2.5">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            ) : (
              icon && <div className="h-4 w-4 flex-shrink-0">{icon}</div>
            )}
            <span className="font-medium">
              {children || `Continue with ${config.name}`}
            </span>
          </div>
        </Button>
      </motion.div>
    )
  }
)
SocialLoginButton.displayName = "SocialLoginButton"

export { SocialLoginButton }
