"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InteractiveCard, InteractiveCardContent, InteractiveCardHeader, InteractiveCardTitle } from "@/components/ui/interactive-card"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface SalesMetricsCardProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  icon: React.ReactNode
  delay?: number
  className?: string
}

export function SalesMetricsCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  delay = 0,
  className
}: SalesMetricsCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null

    if (trend.isPositive === undefined) {
      return <Minus className="h-3 w-3" />
    }

    return trend.isPositive ? (
      <TrendingUp className="h-3 w-3" />
    ) : (
      <TrendingDown className="h-3 w-3" />
    )
  }

  const getTrendColor = () => {
    if (!trend) return ""

    if (trend.isPositive === undefined) {
      return "text-gray-500 dark:text-gray-400"
    }

    return trend.isPositive
      ? "text-green-600 dark:text-green-400"
      : "text-red-600 dark:text-red-400"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={className}
    >
      <InteractiveCard hover="lift" gradient className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-300">
            {title}
          </CardTitle>
          <div className="text-primary-500 dark:text-primary-400">
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {value}
            </div>

            {trend && (
              <div className={cn("flex items-center space-x-1 text-xs", getTrendColor())}>
                {getTrendIcon()}
                <span className="font-medium">{trend.value}%</span>
                <span className="text-gray-500 dark:text-gray-400">{trend.label}</span>
              </div>
            )}

            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        </CardContent>
      </InteractiveCard>
    </motion.div>
  )
}
