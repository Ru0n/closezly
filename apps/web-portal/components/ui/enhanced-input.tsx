import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Eye, EyeOff } from "lucide-react"

export interface EnhancedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  showPasswordToggle?: boolean
  floatingLabel?: boolean
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ className, type, label, error, icon, showPasswordToggle, floatingLabel, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    const [hasValue, setHasValue] = React.useState(() => {
      // Initialize hasValue based on initial value to prevent hydration mismatch
      return Boolean(props.value || props.defaultValue)
    })
    const [isMounted, setIsMounted] = React.useState(false)

    const inputType = showPasswordToggle && type === "password"
      ? (showPassword ? "text" : "password")
      : type

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(e.target.value.length > 0)
      if (props.onChange) {
        props.onChange(e)
      }
    }

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      if (props.onFocus) {
        props.onFocus(e)
      }
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      if (props.onBlur) {
        props.onBlur(e)
      }
    }

    // Check if label should be floating (focused or has value)
    const isLabelFloating = floatingLabel && (isFocused || hasValue || props.value)

    React.useEffect(() => {
      setIsMounted(true)
      // Update hasValue based on current value
      if (props.value || props.defaultValue) {
        setHasValue(true)
      }
    }, [props.value, props.defaultValue])

    // Prevent hydration mismatch by not rendering interactive elements until mounted
    if (!isMounted) {
      return (
        <div className="space-y-2">
          <div className="relative">
            {/* Static label for SSR */}
            {floatingLabel && label && (
              <label className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                {label}
              </label>
            )}

            {/* Icon */}
            {icon && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10">
                {icon}
              </div>
            )}

            {/* Input Field */}
            <input
              type={type}
              className={cn(
                "flex h-12 w-full rounded-lg border border-input bg-background text-sm ring-offset-background",
                "file:border-0 file:bg-transparent file:text-sm file:font-medium",
                "placeholder:text-muted-foreground",
                "focus-visible:outline-none focus-visible:border-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
                "transition-all duration-200",
                "py-4",
                icon ? "pl-10" : "pl-3",
                showPasswordToggle ? "pr-10" : "pr-3",
                floatingLabel && !props.placeholder && "placeholder:opacity-0",
                className
              )}
              ref={ref}
              {...props}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="relative">
          {/* Floating Label */}
          {floatingLabel && label && (
            <label
              className={cn(
                "absolute left-3 transition-all duration-200 pointer-events-none text-muted-foreground",
                isLabelFloating
                  ? "top-0 -translate-y-1/2 text-xs bg-background px-1 text-primary"
                  : "top-1/2 -translate-y-1/2 text-sm",
                icon && !isLabelFloating && "left-10"
              )}
            >
              {label}
            </label>
          )}

          {/* Icon */}
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10">
              {icon}
            </div>
          )}

          {/* Input Field */}
          <input
            type={inputType}
            className={cn(
              "flex h-12 w-full rounded-lg border border-input bg-background text-sm ring-offset-background",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:border-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "transition-all duration-200",
              isFocused && "border-primary",
              error && "border-red-500 focus-visible:border-red-500",
              "py-4",
              icon ? "pl-10" : "pl-3",
              showPasswordToggle ? "pr-10" : "pr-3",
              floatingLabel && !props.placeholder && "placeholder:opacity-0",
              className
            )}
            ref={ref}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleInputChange}
            {...props}
          />

          {/* Password Toggle */}
          {showPasswordToggle && type === "password" && (
            <motion.button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors z-10"
              onClick={() => setShowPassword(!showPassword)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </motion.button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-red-500 dark:text-red-400 flex items-center space-x-1"
          >
            <span>⚠</span>
            <span>{error}</span>
          </motion.div>
        )}
      </div>
    )
  }
)
EnhancedInput.displayName = "EnhancedInput"

export { EnhancedInput }
