import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: "lift" | "glow" | "scale" | "tilt" | "none"
  clickable?: boolean
  gradient?: boolean
}

const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({
    className,
    hover = "lift",
    clickable = false,
    gradient = false,
    children,
    onDrag,
    onDragEnd,
    onDragStart,
    onAnimationStart,
    onAnimationEnd,
    onAnimationIteration,
    ...props
  }, ref) => {
    const cardVariants = {
      initial: {
        scale: 1,
        y: 0,
        rotateX: 0,
        rotateY: 0,
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
      },
      hover: {
        scale: hover === "scale" ? 1.02 : 1,
        y: hover === "lift" ? -4 : 0,
        rotateX: hover === "tilt" ? 5 : 0,
        rotateY: hover === "tilt" ? 5 : 0,
        boxShadow: hover === "glow"
          ? "0 10px 25px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1), 0 0 0 1px rgb(59 130 246 / 0.1)"
          : hover === "lift"
          ? "0 10px 25px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
          : "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        transition: {
          duration: 0.2,
          ease: "easeOut"
        }
      },
      tap: clickable ? {
        scale: 0.98,
        transition: {
          duration: 0.1
        }
      } : {}
    }

    const gradientVariants = {
      initial: { opacity: 0 },
      hover: {
        opacity: 1,
        transition: {
          duration: 0.3
        }
      }
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground relative overflow-hidden",
          clickable && "cursor-pointer",
          className
        )}
        variants={cardVariants}
        initial="initial"
        whileHover={hover !== "none" ? "hover" : undefined}
        whileTap={clickable ? "tap" : undefined}
        {...props}
      >
        {/* Gradient overlay for hover effect */}
        {gradient && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 pointer-events-none"
            variants={gradientVariants}
            initial="initial"
            whileHover="hover"
          />
        )}

        {/* Shimmer effect */}
        {hover === "glow" && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        )}

        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    )
  }
)
InteractiveCard.displayName = "InteractiveCard"

const InteractiveCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
InteractiveCardHeader.displayName = "InteractiveCardHeader"

const InteractiveCardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
InteractiveCardTitle.displayName = "InteractiveCardTitle"

const InteractiveCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
InteractiveCardDescription.displayName = "InteractiveCardDescription"

const InteractiveCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
InteractiveCardContent.displayName = "InteractiveCardContent"

const InteractiveCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
InteractiveCardFooter.displayName = "InteractiveCardFooter"

export {
  InteractiveCard,
  InteractiveCardHeader,
  InteractiveCardTitle,
  InteractiveCardDescription,
  InteractiveCardContent,
  InteractiveCardFooter,
}
