import * as React from "react"
import { cn } from "@/lib/utils"

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full"
  padding?: "none" | "sm" | "md" | "lg" | "xl"
  center?: boolean
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md", 
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-full"
}

const paddingClasses = {
  none: "",
  sm: "px-4 py-2",
  md: "px-6 py-4", 
  lg: "px-8 py-6",
  xl: "px-12 py-8"
}

export function ResponsiveContainer({
  maxWidth = "full",
  padding = "md",
  center = true,
  className,
  children,
  ...props
}: ResponsiveContainerProps) {
  return (
    <div
      className={cn(
        "w-full",
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        center && "mx-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Responsive grid component
interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
    "2xl"?: number
  }
  gap?: "none" | "sm" | "md" | "lg" | "xl"
}

const gapClasses = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6", 
  xl: "gap-8"
}

export function ResponsiveGrid({
  cols = { default: 1, md: 2, lg: 3 },
  gap = "md",
  className,
  children,
  ...props
}: ResponsiveGridProps) {
  const gridClasses = []
  
  if (cols.default) gridClasses.push(`grid-cols-${cols.default}`)
  if (cols.sm) gridClasses.push(`sm:grid-cols-${cols.sm}`)
  if (cols.md) gridClasses.push(`md:grid-cols-${cols.md}`)
  if (cols.lg) gridClasses.push(`lg:grid-cols-${cols.lg}`)
  if (cols.xl) gridClasses.push(`xl:grid-cols-${cols.xl}`)
  if (cols["2xl"]) gridClasses.push(`2xl:grid-cols-${cols["2xl"]}`)

  return (
    <div
      className={cn(
        "grid",
        gapClasses[gap],
        ...gridClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Responsive text component
interface ResponsiveTextProps extends React.HTMLAttributes<HTMLElement> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span"
  size?: {
    default?: string
    sm?: string
    md?: string
    lg?: string
    xl?: string
  }
}

export function ResponsiveText({
  as: Component = "p",
  size = { default: "text-base", md: "text-lg", lg: "text-xl" },
  className,
  children,
  ...props
}: ResponsiveTextProps) {
  const sizeClasses = []
  
  if (size.default) sizeClasses.push(size.default)
  if (size.sm) sizeClasses.push(`sm:${size.sm}`)
  if (size.md) sizeClasses.push(`md:${size.md}`)
  if (size.lg) sizeClasses.push(`lg:${size.lg}`)
  if (size.xl) sizeClasses.push(`xl:${size.xl}`)

  return (
    <Component
      className={cn(...sizeClasses, className)}
      {...props}
    >
      {children}
    </Component>
  )
}

// Responsive spacing component
interface ResponsiveSpacingProps extends React.HTMLAttributes<HTMLDivElement> {
  space?: {
    default?: string
    sm?: string
    md?: string
    lg?: string
    xl?: string
  }
  direction?: "x" | "y" | "all"
}

export function ResponsiveSpacing({
  space = { default: "4", md: "6", lg: "8" },
  direction = "y",
  className,
  children,
  ...props
}: ResponsiveSpacingProps) {
  const spaceClasses = []
  const prefix = direction === "x" ? "space-x" : direction === "y" ? "space-y" : "gap"
  
  if (space.default) spaceClasses.push(`${prefix}-${space.default}`)
  if (space.sm) spaceClasses.push(`sm:${prefix}-${space.sm}`)
  if (space.md) spaceClasses.push(`md:${prefix}-${space.md}`)
  if (space.lg) spaceClasses.push(`lg:${prefix}-${space.lg}`)
  if (space.xl) spaceClasses.push(`xl:${prefix}-${space.xl}`)

  return (
    <div
      className={cn(
        direction === "all" ? "grid" : "flex",
        direction === "y" ? "flex-col" : "",
        ...spaceClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
