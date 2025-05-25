import * as React from "react"
import { motion } from "framer-motion"
import { Button, ButtonProps } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface LoadingButtonProps extends ButtonProps {
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  successIcon?: React.ReactNode
  success?: boolean
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ 
    className, 
    children, 
    loading = false, 
    loadingText, 
    icon, 
    successIcon, 
    success = false,
    disabled,
    ...props 
  }, ref) => {
    const [showSuccess, setShowSuccess] = React.useState(false)

    React.useEffect(() => {
      if (success) {
        setShowSuccess(true)
        const timer = setTimeout(() => setShowSuccess(false), 2000)
        return () => clearTimeout(timer)
      }
    }, [success])

    const isDisabled = loading || disabled

    return (
      <Button
        className={cn(
          "relative overflow-hidden transition-all duration-300",
          loading && "cursor-not-allowed",
          showSuccess && "bg-green-600 hover:bg-green-700",
          className
        )}
        disabled={isDisabled}
        ref={ref}
        {...props}
      >
        <motion.div
          className="flex items-center justify-center space-x-2"
          animate={{
            opacity: loading ? 0.7 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {/* Loading Spinner */}
          {loading && (
            <motion.div
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          )}

          {/* Success Icon */}
          {showSuccess && successIcon && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, type: "spring" }}
            >
              {successIcon}
            </motion.div>
          )}

          {/* Regular Icon */}
          {!loading && !showSuccess && icon && (
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.2 }}
            >
              {icon}
            </motion.div>
          )}

          {/* Button Text */}
          <motion.span
            animate={{
              opacity: loading ? 0.8 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            {loading && loadingText 
              ? loadingText 
              : showSuccess 
                ? "Success!" 
                : children
            }
          </motion.span>
        </motion.div>

        {/* Loading Background Effect */}
        {loading && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: ["-100%", "100%"],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        )}

        {/* Success Background Effect */}
        {showSuccess && (
          <motion.div
            className="absolute inset-0 bg-green-400/20"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </Button>
    )
  }
)

LoadingButton.displayName = "LoadingButton"

export { LoadingButton }
