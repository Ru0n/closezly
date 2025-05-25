"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { 
  Brain, 
  Database, 
  BarChart4, 
  Zap, 
  Target, 
  Clock, 
  Shield, 
  MessageSquare,
  Users,
  TrendingUp,
  CheckCircle,
  ArrowRight
} from "lucide-react"
import Link from "next/link"

const Features = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  }

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  }

  const features = [
    {
      icon: <Brain className="h-8 w-8" />,
      title: "AI-Powered Real-Time Guidance",
      description: "Get instant, contextual suggestions during sales calls to address objections and close deals more effectively.",
      benefits: ["47% faster objection handling", "Real-time conversation analysis", "Smart response suggestions"],
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: <Database className="h-8 w-8" />,
      title: "Seamless CRM Integration",
      description: "Connect with your existing CRM to access customer data and ensure all interactions are documented.",
      benefits: ["Works with 50+ CRM platforms", "Automatic data sync", "Zero manual entry"],
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: <BarChart4 className="h-8 w-8" />,
      title: "Advanced Sales Analytics",
      description: "Gain insights from post-call analysis and continuously improve your sales approach.",
      benefits: ["3x better performance insights", "Predictive analytics", "Custom reporting"],
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Instant Knowledge Access",
      description: "Access product information, pricing, and competitive intelligence instantly during calls.",
      benefits: ["Sub-second response time", "Custom knowledge base", "Smart search"],
      gradient: "from-orange-500 to-red-500"
    },
    {
      icon: <Target className="h-8 w-8" />,
      title: "Smart Lead Scoring",
      description: "Automatically prioritize prospects based on engagement and likelihood to convert.",
      benefits: ["85% accuracy in predictions", "Behavioral analysis", "Automated prioritization"],
      gradient: "from-indigo-500 to-blue-500"
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Automated Follow-ups",
      description: "Never miss a follow-up with intelligent scheduling and personalized messages.",
      benefits: ["40% increase in follow-up rates", "Smart scheduling", "Personalized messaging"],
      gradient: "from-teal-500 to-green-500"
    }
  ]

  const integrations = [
    "Salesforce", "HubSpot", "Pipedrive", "Zoho CRM", "Microsoft Dynamics", "Freshsales"
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="py-20 md:py-28 bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="text-center max-w-4xl mx-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center rounded-full bg-primary-100 dark:bg-primary-900 px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 mb-6"
              >
                ⚡ Powerful Features
              </motion.div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Everything You Need to <span className="text-primary-500">Dominate Sales</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Discover how Closezly's AI-powered features transform every aspect of your sales process, from initial contact to deal closure.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {features.map((feature, index) => (
                <motion.div key={index} variants={fadeIn}>
                  <Card className="h-full hover:shadow-lg transition-all duration-300 border-2 hover:border-primary-500/50">
                    <CardHeader>
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.gradient} p-4 mb-4 shadow-lg`}>
                        <div className="text-white">
                          {feature.icon}
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                        {feature.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600 dark:text-gray-300 mb-4">
                        {feature.description}
                      </p>
                      <ul className="space-y-2">
                        {feature.benefits.map((benefit, idx) => (
                          <li key={idx} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Integrations Section */}
        <section className="py-20 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Seamless Integrations
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Connect with your existing tools and workflows in minutes.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6"
            >
              {integrations.map((integration, index) => (
                <motion.div
                  key={index}
                  variants={fadeIn}
                  className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 text-center"
                >
                  <p className="font-medium text-gray-900 dark:text-white">{integration}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary-500 dark:bg-primary-600">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="text-center max-w-4xl mx-auto"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Ready to Experience These Features?
              </h2>
              <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
                Join thousands of sales professionals who are already using Closezly to close more deals.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-primary-600 hover:bg-primary-50">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button variant="outline" size="lg" className="border-white text-white hover:bg-primary-400">
                    Schedule Demo
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

export default Features
