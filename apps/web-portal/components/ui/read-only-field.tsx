import * as React from "react"
import { cn } from "@/lib/utils"

export interface ReadOnlyFieldProps {
  label: string
  value: string
  icon?: React.ReactNode
  className?: string
  description?: string
}

const ReadOnlyField = React.forwardRef<HTMLDivElement, ReadOnlyFieldProps>(
  ({ label, value, icon, className, description }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)}>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        <div className="relative">
          <div className={cn(
            "flex h-12 w-full items-center rounded-lg border border-input bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-sm",
            "text-gray-900 dark:text-gray-100",
            icon ? "pl-10" : "pl-3"
          )}>
            {icon && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
                {icon}
              </div>
            )}
            <span className="truncate">{value || "Not set"}</span>
          </div>
        </div>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
    )
  }
)

ReadOnlyField.displayName = "ReadOnlyField"

export { ReadOnlyField }
