"use client"

import { motion } from "framer-motion"
import { MessageSquare, Database, BarChart4, Zap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const features = [
  {
    icon: <MessageSquare className="h-10 w-10 text-primary-500" />,
    title: "Real-Time Guidance",
    description: "Get instant, contextual suggestions during sales calls to address objections, highlight key points, and close deals more effectively."
  },
  {
    icon: <Database className="h-10 w-10 text-primary-500" />,
    title: "Seamless CRM Integration",
    description: "Connect with your existing CRM to access customer data, update records, and ensure all interactions are properly documented."
  },
  {
    icon: <BarChart4 className="h-10 w-10 text-primary-500" />,
    title: "Actionable Analytics",
    description: "Gain insights from post-call analysis, identify patterns, and continuously improve your sales approach with data-driven recommendations."
  },
  {
    icon: <Zap className="h-10 w-10 text-primary-500" />,
    title: "Custom Knowledge Retrieval",
    description: "Access your company's product information, pricing, and competitive intelligence instantly during calls when you need it most."
  }
]

const Features = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5
      }
    }
  }

  return (
    <section className="py-20 bg-white dark:bg-gray-900">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features to Boost Your Sales Performance
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Closezly combines AI intelligence with your sales expertise to create an unbeatable team.
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card className="h-full border-2 hover:border-primary-500/50 transition-all duration-300">
                <CardHeader>
                  <div className="mb-4">{feature.icon}</div>
                  <CardTitle className="text-2xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

export default Features
