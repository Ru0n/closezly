import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"

export interface BottomTermsPrivacyProps {
  className?: string
}

const BottomTermsPrivacy = React.forwardRef<HTMLDivElement, BottomTermsPrivacyProps>(
  ({ className }, ref) => {
    return (
      <div 
        ref={ref}
        className={cn(
          "w-full text-center py-6",
          className
        )}
      >
        <p className="text-sm text-muted-foreground">
          <Link 
            href="/terms" 
            className="text-primary hover:text-primary/80 transition-colors underline"
          >
            Terms of Service
          </Link>
          {' | '}
          <Link 
            href="/privacy" 
            className="text-primary hover:text-primary/80 transition-colors underline"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    )
  }
)

BottomTermsPrivacy.displayName = "BottomTermsPrivacy"

export { BottomTermsPrivacy }
