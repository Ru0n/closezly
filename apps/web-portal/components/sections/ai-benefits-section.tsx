"use client"

import { motion } from "framer-motion"
import { AIBenefitCards, AIFeatureHighlight } from "@/components/ui/ai-benefit-cards"
import { AISalesDashboardIllustration, AIConversationIllustration, SalesGrowthIllustration } from "@/components/illustrations/ai-sales-illustrations"
import { ResponsiveContainer, ResponsiveGrid } from "@/components/ui/responsive-container"
import { Typography, Heading2, Lead } from "@/components/ui/typography"
import { InteractiveButton } from "@/components/ui/interactive-button"
import { ArrowRight, Sparkles } from "lucide-react"

export function AIBenefitsSection() {
  const aiFeatures = [
    {
      name: "Smart Call Analysis",
      description: "AI analyzes your calls in real-time to provide actionable insights and suggestions",
      impact: "40% improvement in call outcomes"
    },
    {
      name: "Predictive Lead Scoring",
      description: "Machine learning algorithms identify your most promising prospects automatically",
      impact: "60% increase in qualified leads"
    },
    {
      name: "Automated Follow-ups",
      description: "Never miss a follow-up opportunity with AI-powered scheduling and reminders",
      impact: "85% reduction in missed opportunities"
    },
    {
      name: "Performance Optimization",
      description: "Continuous learning from your successful patterns to improve future performance",
      impact: "25% boost in conversion rates"
    }
  ]

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20">
      <ResponsiveContainer padding="lg">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-primary-100 dark:bg-primary-900/30 px-4 py-2 rounded-full mb-6">
            <Sparkles className="h-4 w-4 text-primary-600 dark:text-primary-400" />
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              AI-Powered Sales Intelligence
            </span>
          </div>
          
          <Heading2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Transform Your Sales Process with AI
          </Heading2>
          
          <Lead className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Leverage cutting-edge artificial intelligence to boost your sales performance, 
            close more deals, and build stronger customer relationships.
          </Lead>
        </motion.div>

        {/* Main Illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="flex justify-center mb-16"
        >
          <AISalesDashboardIllustration className="max-w-2xl w-full" />
        </motion.div>

        {/* AI Benefits Cards */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-20"
        >
          <AIBenefitCards />
        </motion.div>

        {/* Feature Highlight */}
        <ResponsiveGrid 
          cols={{ default: 1, lg: 2 }} 
          gap="xl" 
          className="mb-16 items-center"
        >
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <AIFeatureHighlight
              title="Advanced AI Features"
              subtitle="Discover how our AI technology revolutionizes your sales workflow"
              features={aiFeatures}
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-8"
          >
            <AIConversationIllustration className="w-full" />
            <SalesGrowthIllustration className="w-full" />
          </motion.div>
        </ResponsiveGrid>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center"
        >
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 lg:p-12 shadow-xl border border-gray-200 dark:border-gray-700">
            <Heading2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Supercharge Your Sales?
            </Heading2>
            
            <Typography className="text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Join thousands of sales professionals who have already transformed their 
              performance with our AI-powered platform.
            </Typography>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <InteractiveButton
                size="lg"
                effect="shimmer"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                className="px-8 py-3"
              >
                Start Free Trial
              </InteractiveButton>
              
              <InteractiveButton
                variant="outline"
                size="lg"
                effect="lift"
                className="px-8 py-3"
              >
                Watch Demo
              </InteractiveButton>
            </div>
            
            <Typography variant="small" color="muted" className="mt-4">
              No credit card required • 14-day free trial • Cancel anytime
            </Typography>
          </div>
        </motion.div>
      </ResponsiveContainer>
    </section>
  )
}
