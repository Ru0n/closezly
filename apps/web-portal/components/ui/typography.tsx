import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const typographyVariants = cva("", {
  variants: {
    variant: {
      h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl",
      h2: "scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0",
      h3: "scroll-m-20 text-2xl font-semibold tracking-tight",
      h4: "scroll-m-20 text-xl font-semibold tracking-tight",
      h5: "scroll-m-20 text-lg font-semibold tracking-tight",
      h6: "scroll-m-20 text-base font-semibold tracking-tight",
      p: "leading-7 [&:not(:first-child)]:mt-6",
      lead: "text-xl text-muted-foreground",
      large: "text-lg font-semibold",
      small: "text-sm font-medium leading-none",
      muted: "text-sm text-muted-foreground",
      code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",
      blockquote: "mt-6 border-l-2 pl-6 italic",
    },
    color: {
      default: "",
      primary: "text-primary",
      secondary: "text-secondary-foreground",
      muted: "text-muted-foreground",
      destructive: "text-destructive",
      success: "text-green-600 dark:text-green-400",
      warning: "text-yellow-600 dark:text-yellow-400",
      info: "text-blue-600 dark:text-blue-400",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
      justify: "text-justify",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
      extrabold: "font-extrabold",
    },
  },
  defaultVariants: {
    variant: "p",
    color: "default",
    align: "left",
    weight: "normal",
  },
})

export interface TypographyProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "color">,
    VariantProps<typeof typographyVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "blockquote" | "code"
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  ({ className, variant, color, align, weight, as, ...props }, ref) => {
    const Comp = as || (variant?.startsWith("h") ? variant as keyof JSX.IntrinsicElements : "p")

    return React.createElement(
      Comp,
      {
        className: cn(typographyVariants({ variant, color, align, weight, className })),
        ref: ref as any,
        ...props
      }
    )
  }
)
Typography.displayName = "Typography"

// Predefined typography components for common use cases
export const Heading1 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, "variant" | "as">>(
  ({ className, ...props }, ref) => (
    <Typography
      as="h1"
      variant="h1"
      className={className}
      ref={ref as any}
      {...props}
    />
  )
)
Heading1.displayName = "Heading1"

export const Heading2 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, "variant" | "as">>(
  ({ className, ...props }, ref) => (
    <Typography
      as="h2"
      variant="h2"
      className={className}
      ref={ref as any}
      {...props}
    />
  )
)
Heading2.displayName = "Heading2"

export const Heading3 = React.forwardRef<HTMLHeadingElement, Omit<TypographyProps, "variant" | "as">>(
  ({ className, ...props }, ref) => (
    <Typography
      as="h3"
      variant="h3"
      className={className}
      ref={ref as any}
      {...props}
    />
  )
)
Heading3.displayName = "Heading3"

export const Paragraph = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, "variant" | "as">>(
  ({ className, ...props }, ref) => (
    <Typography
      as="p"
      variant="p"
      className={className}
      ref={ref as any}
      {...props}
    />
  )
)
Paragraph.displayName = "Paragraph"

export const Lead = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, "variant" | "as">>(
  ({ className, ...props }, ref) => (
    <Typography
      as="p"
      variant="lead"
      className={className}
      ref={ref as any}
      {...props}
    />
  )
)
Lead.displayName = "Lead"

export const Muted = React.forwardRef<HTMLParagraphElement, Omit<TypographyProps, "variant" | "as">>(
  ({ className, ...props }, ref) => (
    <Typography
      as="p"
      variant="muted"
      className={className}
      ref={ref as any}
      {...props}
    />
  )
)
Muted.displayName = "Muted"

export const Code = React.forwardRef<HTMLElement, Omit<TypographyProps, "variant" | "as">>(
  ({ className, ...props }, ref) => (
    <Typography
      as="code"
      variant="code"
      className={className}
      ref={ref as any}
      {...props}
    />
  )
)
Code.displayName = "Code"

export { Typography, typographyVariants }
