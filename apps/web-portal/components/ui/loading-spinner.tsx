import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "dots" | "pulse" | "bars" | "ring"
  className?: string
  text?: string
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6", 
  lg: "w-8 h-8",
  xl: "w-12 h-12"
}

const textSizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-lg", 
  xl: "text-xl"
}

export function LoadingSpinner({ 
  size = "md", 
  variant = "default", 
  className, 
  text 
}: LoadingSpinnerProps) {
  const renderSpinner = () => {
    switch (variant) {
      case "dots":
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-primary-500 rounded-full"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.7, 1, 0.7],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        )

      case "pulse":
        return (
          <motion.div
            className={cn("bg-primary-500 rounded-full", sizeClasses[size])}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
        )

      case "bars":
        return (
          <div className="flex space-x-1 items-end">
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="w-1 bg-primary-500 rounded-full"
                style={{ height: size === "sm" ? "12px" : size === "md" ? "16px" : size === "lg" ? "20px" : "24px" }}
                animate={{
                  scaleY: [1, 2, 1],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.1,
                }}
              />
            ))}
          </div>
        )

      case "ring":
        return (
          <div className={cn("relative", sizeClasses[size])}>
            <motion.div
              className="absolute inset-0 border-2 border-primary-200 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.div
              className="absolute inset-0 border-2 border-transparent border-t-primary-500 rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
          </div>
        )

      default:
        return (
          <motion.div
            className={cn(
              "border-2 border-primary-200 border-t-primary-500 rounded-full",
              sizeClasses[size]
            )}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        )
    }
  }

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-2", className)}>
      {renderSpinner()}
      {text && (
        <motion.p
          className={cn(
            "text-gray-600 dark:text-gray-300 font-medium",
            textSizeClasses[size]
          )}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  )
}
