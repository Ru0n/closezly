"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, Phone, Mail, Calendar, ArrowRight } from "lucide-react"

// Sample quick wins data
const quickWins = [
  {
    id: 1,
    type: 'call',
    icon: <Phone className="h-4 w-4" />,
    title: 'Follow up with TechCorp',
    description: 'High-value prospect, last contact 3 days ago',
    priority: 'high',
    estimatedValue: '$45K',
    timeToComplete: '15 min',
    action: 'Call Now'
  },
  {
    id: 2,
    type: 'email',
    icon: <Mail className="h-4 w-4" />,
    title: 'Send proposal to GlobalSoft',
    description: 'Decision maker requested pricing yesterday',
    priority: 'urgent',
    estimatedValue: '$78K',
    timeToComplete: '30 min',
    action: 'Send Proposal'
  },
  {
    id: 3,
    type: 'meeting',
    icon: <Calendar className="h-4 w-4" />,
    title: 'Schedule demo with StartupXYZ',
    description: 'Warm lead from last week\'s webinar',
    priority: 'medium',
    estimatedValue: '$22K',
    timeToComplete: '10 min',
    action: 'Schedule'
  },
  {
    id: 4,
    type: 'follow-up',
    icon: <Clock className="h-4 w-4" />,
    title: 'Check in with Enterprise Corp',
    description: 'Proposal sent 1 week ago, no response',
    priority: 'medium',
    estimatedValue: '$95K',
    timeToComplete: '20 min',
    action: 'Follow Up'
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
    case 'call':
      return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20'
    case 'email':
      return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20'
    case 'meeting':
      return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20'
    case 'follow-up':
      return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20'
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20'
  }
}

interface QuickWinsProps {
  delay?: number
}

export function QuickWins({ delay = 0 }: QuickWinsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            Quick Wins
          </CardTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            High-impact actions to boost your sales today
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quickWins.map((win, index) => (
              <motion.div
                key={win.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: delay + (index * 0.1) }}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`p-2 rounded-full ${getTypeColor(win.type)}`}>
                    {win.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                        {win.title}
                      </h4>
                      <Badge className={getPriorityColor(win.priority)}>
                        {win.priority}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {win.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                      <span>Value: {win.estimatedValue}</span>
                      <span>Time: {win.timeToComplete}</span>
                    </div>
                  </div>
                </div>
                
                <Button size="sm" className="ml-4">
                  {win.action}
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-300">
                Total potential value: <span className="font-semibold text-primary-600 dark:text-primary-400">$240K</span>
              </span>
              <Button variant="outline" size="sm">
                View All Tasks
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
