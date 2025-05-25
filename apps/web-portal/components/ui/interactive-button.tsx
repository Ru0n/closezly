import * as React from "react"
import { motion } from "framer-motion"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const interactiveButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-md hover:shadow-lg",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
      effect: {
        none: "",
        glow: "hover:shadow-primary/25",
        lift: "hover:-translate-y-0.5",
        scale: "hover:scale-105",
        shimmer: "",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      effect: "lift",
    },
  }
)

export interface InteractiveButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof interactiveButtonVariants> {
  asChild?: boolean
  icon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const InteractiveButton = React.forwardRef<HTMLButtonElement, InteractiveButtonProps>(
  ({ className, variant, size, effect, asChild = false, icon, rightIcon, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const buttonContent = (
      <>
        {/* Shimmer effect */}
        {effect === "shimmer" && (
          <motion.div
            className="absolute inset-0 -top-2 -bottom-2 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.6 }}
          />
        )}
        
        {/* Button content */}
        <div className="flex items-center justify-center space-x-2 relative z-10">
          {icon && (
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              {icon}
            </motion.div>
          )}
          <span>{children}</span>
          {rightIcon && (
            <motion.div
              whileHover={{ scale: 1.1, x: 2 }}
              transition={{ duration: 0.2 }}
            >
              {rightIcon}
            </motion.div>
          )}
        </div>
      </>
    )

    if (effect === "scale") {
      return (
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Comp
            className={cn(interactiveButtonVariants({ variant, size, effect, className }))}
            ref={ref}
            {...props}
          >
            {buttonContent}
          </Comp>
        </motion.div>
      )
    }

    if (effect === "lift") {
      return (
        <motion.div
          whileHover={{ y: -2 }}
          whileTap={{ y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Comp
            className={cn(interactiveButtonVariants({ variant, size, effect, className }))}
            ref={ref}
            {...props}
          >
            {buttonContent}
          </Comp>
        </motion.div>
      )
    }

    return (
      <Comp
        className={cn(interactiveButtonVariants({ variant, size, effect, className }))}
        ref={ref}
        {...props}
      >
        {buttonContent}
      </Comp>
    )
  }
)
InteractiveButton.displayName = "InteractiveButton"

export { InteractiveButton, interactiveButtonVariants }
