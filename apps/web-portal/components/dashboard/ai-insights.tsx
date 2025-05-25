"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, TrendingUp, Target, Clock, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Sample AI insights data
const insights = [
  {
    id: 1,
    type: 'opportunity',
    icon: <TrendingUp className="h-4 w-4" />,
    title: 'High-Value Prospect Identified',
    description: 'TechCorp Inc. shows 85% likelihood of conversion based on engagement patterns.',
    priority: 'high',
    action: 'Schedule follow-up call',
    confidence: 85
  },
  {
    id: 2,
    type: 'warning',
    icon: <AlertCircle className="h-4 w-4" />,
    title: 'Deal at Risk',
    description: 'GlobalSoft deal has been stagnant for 14 days. Competitor activity detected.',
    priority: 'urgent',
    action: 'Immediate outreach required',
    confidence: 92
  },
  {
    id: 3,
    type: 'optimization',
    icon: <Target className="h-4 w-4" />,
    title: 'Optimal Call Time',
    description: 'Best time to call prospects is Tuesday 2-4 PM based on your success rate.',
    priority: 'medium',
    action: 'Adjust call schedule',
    confidence: 78
  },
  {
    id: 4,
    type: 'timing',
    icon: <Clock className="h-4 w-4" />,
    title: 'Follow-up Reminder',
    description: '3 prospects are ready for follow-up calls based on last interaction timing.',
    priority: 'medium',
    action: 'Review follow-up list',
    confidence: 88
  }
]

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    case 'high':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
    case 'medium':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }
}

const getTypeColor = (type: string) => {
  switch (type) {
    case 'opportunity':
      return 'text-green-600 dark:text-green-400'
    case 'warning':
      return 'text-red-600 dark:text-red-400'
    case 'optimization':
      return 'text-blue-600 dark:text-blue-400'
    case 'timing':
      return 'text-purple-600 dark:text-purple-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

interface AIInsightsProps {
  delay?: number
}

export function AIInsights({ delay = 0 }: AIInsightsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="col-span-1 md:col-span-3">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary-500" />
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              AI-Powered Insights
            </CardTitle>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Personalized recommendations to optimize your sales performance
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: delay + (index * 0.1) }}
                className="flex items-start space-x-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className={`p-2 rounded-full ${getTypeColor(insight.type)}`}>
                  {insight.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {insight.title}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(insight.priority)}>
                        {insight.priority}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {insight.confidence}% confidence
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                    {insight.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
                      Recommended: {insight.action}
                    </span>
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div 
                        className="bg-primary-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${insight.confidence}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
