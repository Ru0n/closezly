"use client"

import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { CheckCircle, ArrowRight, Star, Zap } from "lucide-react"
import Link from "next/link"

const Pricing = () => {
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

  const plans = [
    {
      name: "Starter",
      price: "$49",
      period: "per user/month",
      description: "Perfect for individual sales professionals getting started with AI assistance.",
      features: [
        "Real-time AI guidance during calls",
        "Basic CRM integration",
        "Post-call analytics",
        "Email support",
        "Up to 100 calls/month"
      ],
      cta: "Start Free Trial",
      popular: false,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      name: "Professional",
      price: "$99",
      period: "per user/month",
      description: "Advanced features for sales teams looking to maximize performance.",
      features: [
        "Everything in Starter",
        "Advanced AI insights",
        "Custom knowledge base",
        "Team analytics dashboard",
        "Priority support",
        "Unlimited calls",
        "Lead scoring",
        "Automated follow-ups"
      ],
      cta: "Start Free Trial",
      popular: true,
      gradient: "from-primary-500 to-purple-500"
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact sales",
      description: "Tailored solutions for large organizations with specific requirements.",
      features: [
        "Everything in Professional",
        "Custom AI training",
        "Advanced integrations",
        "Dedicated success manager",
        "24/7 phone support",
        "Custom reporting",
        "SSO & advanced security",
        "API access"
      ],
      cta: "Contact Sales",
      popular: false,
      gradient: "from-purple-500 to-pink-500"
    }
  ]

  const faqs = [
    {
      question: "Is there a free trial?",
      answer: "Yes! We offer a 14-day free trial for all plans. No credit card required to get started."
    },
    {
      question: "Can I change plans anytime?",
      answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately."
    },
    {
      question: "What CRMs do you integrate with?",
      answer: "We integrate with 50+ CRM platforms including Salesforce, HubSpot, Pipedrive, and more."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, we use enterprise-grade security with SOC 2 compliance and end-to-end encryption."
    }
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
                💰 Simple Pricing
              </motion.div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Choose Your <span className="text-primary-500">Success Plan</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                Start with a 14-day free trial. No credit card required. Scale as you grow.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto"
            >
              {plans.map((plan, index) => (
                <motion.div key={index} variants={fadeIn}>
                  <Card className={`h-full relative ${plan.popular ? 'border-primary-500 border-2 shadow-xl scale-105' : 'border-gray-200 dark:border-gray-700'} hover:shadow-lg transition-all duration-300`}>
                    {plan.popular && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div className="bg-primary-500 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center">
                          <Star className="h-4 w-4 mr-1" />
                          Most Popular
                        </div>
                      </div>
                    )}
                    
                    <CardHeader className="text-center pb-4">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${plan.gradient} p-4 mx-auto mb-4 shadow-lg`}>
                        <Zap className="h-8 w-8 text-white" />
                      </div>
                      <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                        {plan.name}
                      </CardTitle>
                      <div className="mt-4">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                        {plan.price !== "Custom" && <span className="text-gray-500 dark:text-gray-400">/{plan.period}</span>}
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 mt-2">{plan.description}</p>
                    </CardHeader>
                    
                    <CardContent>
                      <ul className="space-y-3 mb-8">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-600 dark:text-gray-300">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Link href={plan.cta === "Contact Sales" ? "/contact" : "/signup"}>
                        <Button 
                          className={`w-full ${plan.popular ? 'bg-primary-500 hover:bg-primary-600' : ''}`}
                          variant={plan.popular ? "default" : "outline"}
                          size="lg"
                        >
                          {plan.cta}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
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
                Frequently Asked Questions
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Everything you need to know about our pricing and plans.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="max-w-3xl mx-auto space-y-6"
            >
              {faqs.map((faq, index) => (
                <motion.div key={index} variants={fadeIn}>
                  <Card className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      {faq.answer}
                    </p>
                  </Card>
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
                Ready to Get Started?
              </h2>
              <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
                Join thousands of sales professionals who trust Closezly to boost their performance.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-primary-600 hover:bg-primary-50">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button variant="outline" size="lg" className="border-white text-white hover:bg-primary-400">
                    Contact Sales
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

export default Pricing
