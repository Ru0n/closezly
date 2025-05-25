import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface TermsAndPrivacyProps {
  className?: string
  mode?: 'login' | 'signup'
}

const TermsAndPrivacy = React.forwardRef<HTMLDivElement, TermsAndPrivacyProps>(
  ({ className, mode = 'signup' }, ref) => {
    const text = mode === 'login' 
      ? "By signing in, you agree to the"
      : "By registering, you agree to the"

    return (
      <div 
        ref={ref}
        className={cn(
          "text-center",
          className
        )}
      >
        <p className="text-xs text-muted-foreground">
          {text}{' '}
          <Link 
            href="/terms" 
            className="text-primary hover:text-primary/80 underline transition-colors"
          >
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link 
            href="/privacy" 
            className="text-primary hover:text-primary/80 underline transition-colors"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    )
  }
)

TermsAndPrivacy.displayName = "TermsAndPrivacy"

export { TermsAndPrivacy }
