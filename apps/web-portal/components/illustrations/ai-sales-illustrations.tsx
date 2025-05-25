import * as React from "react"
import { motion } from "framer-motion"

interface IllustrationProps {
  className?: string
  animated?: boolean
}

// AI-Powered Sales Dashboard Illustration
export function AISalesDashboardIllustration({ className, animated = true }: IllustrationProps) {
  return (
    <div className={className}>
      <svg
        width="400"
        height="300"
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="400" height="300" fill="url(#dashboardGradient)" rx="12" />
        
        {/* Dashboard Screen */}
        <motion.rect
          x="50"
          y="50"
          width="300"
          height="200"
          rx="8"
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="2"
          initial={animated ? { opacity: 0, scale: 0.9 } : {}}
          animate={animated ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5 }}
        />
        
        {/* Charts */}
        <motion.g
          initial={animated ? { opacity: 0, y: 20 } : {}}
          animate={animated ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {/* Bar Chart */}
          <rect x="70" y="120" width="8" height="40" fill="#4a6cf7" rx="2" />
          <rect x="85" y="100" width="8" height="60" fill="#4a6cf7" rx="2" />
          <rect x="100" y="110" width="8" height="50" fill="#4a6cf7" rx="2" />
          <rect x="115" y="90" width="8" height="70" fill="#4a6cf7" rx="2" />
          
          {/* Line Chart */}
          <path
            d="M150 140 L170 120 L190 130 L210 110 L230 100"
            stroke="#10b981"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <circle cx="150" cy="140" r="3" fill="#10b981" />
          <circle cx="170" cy="120" r="3" fill="#10b981" />
          <circle cx="190" cy="130" r="3" fill="#10b981" />
          <circle cx="210" cy="110" r="3" fill="#10b981" />
          <circle cx="230" cy="100" r="3" fill="#10b981" />
        </motion.g>
        
        {/* AI Brain */}
        <motion.g
          initial={animated ? { opacity: 0, scale: 0 } : {}}
          animate={animated ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <circle cx="320" cy="80" r="20" fill="#4a6cf7" opacity="0.1" />
          <path
            d="M310 75C310 70 314 66 320 66C326 66 330 70 330 75C330 77 329 78.5 327.5 79.5C329 80.5 330 82.5 330 85C330 89 326 93 320 93C314 93 310 89 310 85C310 82.5 311 80.5 312.5 79.5C311 78.5 310 77 310 75Z"
            fill="#4a6cf7"
          />
          <circle cx="316" cy="76" r="1" fill="white" />
          <circle cx="324" cy="76" r="1" fill="white" />
          <path d="M316 82C316.5 82.5 317.5 83 320 83C322.5 83 323.5 82.5 324 82" stroke="white" strokeWidth="1" strokeLinecap="round" />
        </motion.g>
        
        {/* Floating Data Points */}
        {animated && (
          <>
            <motion.circle
              cx="80"
              cy="80"
              r="3"
              fill="#f59e0b"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <motion.circle
              cx="320"
              cy="180"
              r="2"
              fill="#ef4444"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            />
            <motion.circle
              cx="120"
              cy="200"
              r="2.5"
              fill="#8b5cf6"
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            />
          </>
        )}
        
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="dashboardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// AI Assistant Conversation Illustration
export function AIConversationIllustration({ className, animated = true }: IllustrationProps) {
  return (
    <div className={className}>
      <svg
        width="350"
        height="250"
        viewBox="0 0 350 250"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Chat Interface */}
        <motion.rect
          x="25"
          y="25"
          width="300"
          height="200"
          rx="12"
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="2"
          initial={animated ? { opacity: 0, scale: 0.9 } : {}}
          animate={animated ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5 }}
        />
        
        {/* Header */}
        <rect x="25" y="25" width="300" height="40" fill="#4a6cf7" rx="12" />
        <circle cx="50" cy="45" r="8" fill="white" opacity="0.9" />
        <rect x="70" y="40" width="80" height="4" fill="white" opacity="0.9" rx="2" />
        <rect x="70" y="48" width="60" height="3" fill="white" opacity="0.7" rx="1.5" />
        
        {/* Messages */}
        <motion.g
          initial={animated ? { opacity: 0, y: 20 } : {}}
          animate={animated ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* User Message */}
          <rect x="180" y="85" width="120" height="30" fill="#e5e7eb" rx="15" />
          <rect x="190" y="92" width="80" height="3" fill="#6b7280" rx="1.5" />
          <rect x="190" y="98" width="60" height="3" fill="#6b7280" rx="1.5" />
          <rect x="190" y="104" width="40" height="3" fill="#6b7280" rx="1.5" />
          
          {/* AI Response */}
          <rect x="50" y="130" width="140" height="40" fill="#4a6cf7" rx="15" />
          <rect x="60" y="138" width="90" height="3" fill="white" rx="1.5" />
          <rect x="60" y="144" width="70" height="3" fill="white" rx="1.5" />
          <rect x="60" y="150" width="100" height="3" fill="white" rx="1.5" />
          <rect x="60" y="156" width="50" height="3" fill="white" rx="1.5" />
        </motion.g>
        
        {/* Typing Indicator */}
        {animated && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <rect x="50" y="185" width="60" height="25" fill="#f3f4f6" rx="12" />
            <motion.circle
              cx="65"
              cy="197"
              r="2"
              fill="#9ca3af"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0 }}
            />
            <motion.circle
              cx="75"
              cy="197"
              r="2"
              fill="#9ca3af"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            />
            <motion.circle
              cx="85"
              cy="197"
              r="2"
              fill="#9ca3af"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            />
          </motion.g>
        )}
      </svg>
    </div>
  )
}

// Sales Growth Illustration
export function SalesGrowthIllustration({ className, animated = true }: IllustrationProps) {
  return (
    <div className={className}>
      <svg
        width="300"
        height="200"
        viewBox="0 0 300 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Growth Arrow */}
        <motion.path
          d="M50 150 L100 120 L150 100 L200 70 L250 40"
          stroke="#10b981"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animated ? { pathLength: 0 } : {}}
          animate={animated ? { pathLength: 1 } : {}}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
        
        {/* Arrow Head */}
        <motion.path
          d="M240 35 L250 40 L245 50"
          stroke="#10b981"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={animated ? { opacity: 0, scale: 0 } : {}}
          animate={animated ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 1.5 }}
        />
        
        {/* Data Points */}
        <motion.circle
          cx="50"
          cy="150"
          r="4"
          fill="#10b981"
          initial={animated ? { scale: 0 } : {}}
          animate={animated ? { scale: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.5 }}
        />
        <motion.circle
          cx="100"
          cy="120"
          r="4"
          fill="#10b981"
          initial={animated ? { scale: 0 } : {}}
          animate={animated ? { scale: 1 } : {}}
          transition={{ duration: 0.3, delay: 0.8 }}
        />
        <motion.circle
          cx="150"
          cy="100"
          r="4"
          fill="#10b981"
          initial={animated ? { scale: 0 } : {}}
          animate={animated ? { scale: 1 } : {}}
          transition={{ duration: 0.3, delay: 1.1 }}
        />
        <motion.circle
          cx="200"
          cy="70"
          r="4"
          fill="#10b981"
          initial={animated ? { scale: 0 } : {}}
          animate={animated ? { scale: 1 } : {}}
          transition={{ duration: 0.3, delay: 1.4 }}
        />
        
        {/* Revenue Labels */}
        <motion.text
          x="50"
          y="170"
          textAnchor="middle"
          fontSize="12"
          fill="#6b7280"
          initial={animated ? { opacity: 0 } : {}}
          animate={animated ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 2 }}
        >
          $50K
        </motion.text>
        <motion.text
          x="100"
          y="170"
          textAnchor="middle"
          fontSize="12"
          fill="#6b7280"
          initial={animated ? { opacity: 0 } : {}}
          animate={animated ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 2.2 }}
        >
          $75K
        </motion.text>
        <motion.text
          x="150"
          y="170"
          textAnchor="middle"
          fontSize="12"
          fill="#6b7280"
          initial={animated ? { opacity: 0 } : {}}
          animate={animated ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 2.4 }}
        >
          $100K
        </motion.text>
        <motion.text
          x="200"
          y="170"
          textAnchor="middle"
          fontSize="12"
          fill="#6b7280"
          initial={animated ? { opacity: 0 } : {}}
          animate={animated ? { opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: 2.6 }}
        >
          $150K
        </motion.text>
      </svg>
    </div>
  )
}
