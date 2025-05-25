"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InteractiveCard } from "@/components/ui/interactive-card"
import { AIBrainIcon, SalesFunnelIcon, RevenueGrowthIcon, AIAssistantIcon } from "@/components/icons/ai-sales-icons"
import { Badge } from "@/components/ui/badge"

interface AIBenefitCardProps {
  title: string
  description: string
  benefits: string[]
  icon: React.ReactNode
  color: string
  delay?: number
}

export function AIBenefitCard({
  title,
  description,
  benefits,
  icon,
  color,
  delay = 0
}: AIBenefitCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <InteractiveCard hover="lift" gradient className="h-full">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${color}`}>
              {icon}
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {description}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: delay + (index * 0.1) }}
                className="flex items-center space-x-2"
              >
                <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {benefit}
                </span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </InteractiveCard>
    </motion.div>
  )
}

// Pre-configured AI benefit cards
export function AIBenefitCards() {
  const benefits = [
    {
      title: "Real-time AI Guidance",
      description: "Get instant suggestions during sales calls",
      benefits: [
        "Smart conversation prompts",
        "Objection handling tips",
        "Next best action recommendations",
        "Sentiment analysis insights"
      ],
      icon: <AIBrainIcon size={24} className="text-white" />,
      color: "bg-blue-500",
      delay: 0
    },
    {
      title: "Sales Process Optimization",
      description: "Streamline your sales funnel with AI insights",
      benefits: [
        "Automated lead scoring",
        "Pipeline stage predictions",
        "Deal risk assessment",
        "Conversion rate optimization"
      ],
      icon: <SalesFunnelIcon size={24} className="text-white" />,
      color: "bg-green-500",
      delay: 0.2
    },
    {
      title: "Revenue Intelligence",
      description: "Data-driven insights to boost your revenue",
      benefits: [
        "Revenue forecasting",
        "Performance benchmarking",
        "Market trend analysis",
        "Competitive intelligence"
      ],
      icon: <RevenueGrowthIcon size={24} className="text-white" />,
      color: "bg-purple-500",
      delay: 0.4
    },
    {
      title: "24/7 AI Assistant",
      description: "Your personal sales coach, always available",
      benefits: [
        "Call preparation assistance",
        "Follow-up reminders",
        "CRM data enrichment",
        "Performance coaching"
      ],
      icon: <AIAssistantIcon size={24} className="text-white" />,
      color: "bg-orange-500",
      delay: 0.6
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {benefits.map((benefit, index) => (
        <AIBenefitCard key={index} {...benefit} />
      ))}
    </div>
  )
}

// AI Feature Highlight Component
interface AIFeatureHighlightProps {
  title: string
  subtitle: string
  features: Array<{
    name: string
    description: string
    impact: string
  }>
  className?: string
}

export function AIFeatureHighlight({
  title,
  subtitle,
  features,
  className
}: AIFeatureHighlightProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className={className}
    >
      <Card className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-blue-50 dark:from-primary-900/20 dark:to-blue-900/20" />
        
        <CardHeader className="relative z-10 text-center pb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mb-4"
          >
            <AIBrainIcon size={32} className="text-white" />
          </motion.div>
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </CardTitle>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {subtitle}
          </p>
        </CardHeader>
        
        <CardContent className="relative z-10">
          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + (index * 0.1) }}
                className="flex items-start space-x-4"
              >
                <div className="flex-shrink-0 w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                    {index + 1}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {feature.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {feature.description}
                  </p>
                  <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                    {feature.impact}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
