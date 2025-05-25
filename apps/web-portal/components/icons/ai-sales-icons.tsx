import * as React from "react"

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number
}

// AI Brain Icon
export function AIBrainIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 2C8.5 2 6 4.5 6 8C6 9.5 6.5 10.8 7.3 11.8C6.5 12.5 6 13.7 6 15C6 17.2 7.8 19 10 19H14C16.2 19 18 17.2 18 15C18 13.7 17.5 12.5 16.7 11.8C17.5 10.8 18 9.5 18 8C18 4.5 15.5 2 12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
      <path
        d="M9 13C9.5 13.5 10.5 14 12 14C13.5 14 14.5 13.5 15 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 6C8.5 5.5 9.5 5 11 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 6C15.5 5.5 14.5 5 13 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Sales Funnel Icon
export function SalesFunnelIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M4 4H20L18 8H6L4 4Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 8L8 12H16L18 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 12L10 16H14L16 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 16L11 20H13L14 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Revenue Growth Icon
export function RevenueGrowthIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M3 17L9 11L13 15L21 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 7H21V11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="6" cy="18" r="1" fill="currentColor" />
      <circle cx="18" cy="6" r="1" fill="currentColor" />
      <path
        d="M7 21H17C18.1 21 19 20.1 19 19V5C19 3.9 18.1 3 17 3H7C5.9 3 5 3.9 5 5V19C5 20.1 5.9 21 7 21Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}

// AI Assistant Icon
export function AIAssistantIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M8 12C8 10.5 9.5 9 12 9C14.5 9 16 10.5 16 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="9" cy="9" r="1" fill="currentColor" />
      <circle cx="15" cy="9" r="1" fill="currentColor" />
      <path
        d="M12 16V18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8 18H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 6L8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 6L16 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Call Analytics Icon
export function CallAnalyticsIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M22 16.92V19.92C22 20.52 21.52 21 20.92 21C10.4 21 2 12.6 2 2.08C2 1.48 2.48 1 3.08 1H6.08C6.68 1 7.16 1.48 7.16 2.08C7.16 3.68 7.44 5.2 7.96 6.6C8.12 7 8 7.44 7.68 7.76L6.24 9.2C7.84 12.36 10.64 15.16 13.8 16.76L15.24 15.32C15.56 15 16 14.88 16.4 15.04C17.8 15.56 19.32 15.84 20.92 15.84C21.52 15.84 22 16.32 22 16.92Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7L17 9L21 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Deal Pipeline Icon
export function DealPipelineIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M7 8V16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 6V16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M17 10V16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="7" cy="8" r="1" fill="currentColor" />
      <circle cx="12" cy="6" r="1" fill="currentColor" />
      <circle cx="17" cy="10" r="1" fill="currentColor" />
    </svg>
  )
}

// Smart Insights Icon
export function SmartInsightsIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M12 6V12L16 14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 2L9 5L12 4L15 5L16 2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

// Performance Metrics Icon
export function PerformanceMetricsIcon({ size = 24, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M8 12L12 8L16 12L20 8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="8" r="1" fill="currentColor" />
      <circle cx="16" cy="12" r="1" fill="currentColor" />
      <circle cx="20" cy="8" r="1" fill="currentColor" />
      <path
        d="M8 16H16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
