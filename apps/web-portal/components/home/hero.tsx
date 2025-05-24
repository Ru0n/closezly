"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const Hero = () => {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-white to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center">
          {/* Text Content */}
          <motion.div 
            className="lg:w-1/2 mb-12 lg:mb-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Your AI-Powered <span className="text-primary-500">Sales Co-Pilot</span>
            </motion.h1>
            <motion.p 
              className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              Empower your B2B sales team with real-time guidance, seamless CRM integration, and actionable insights to close more deals.
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              <Link href="/signup">
                <Button size="lg" className="px-8">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg">
                  Request Demo
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          {/* Image/Animation */}
          <motion.div 
            className="lg:w-1/2"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="relative">
              <div className="bg-primary-500/10 dark:bg-primary-500/5 rounded-3xl p-4 md:p-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300">
                          <span className="font-semibold">C</span>
                        </div>
                        <div className="ml-3">
                          <h3 className="font-medium text-gray-900 dark:text-white">Closezly Assistant</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Your AI sales co-pilot</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Active</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg max-w-[80%]">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          I noticed the prospect mentioned budget concerns. Here are 3 talking points to address this:
                        </p>
                      </div>
                      <div className="bg-primary-50 dark:bg-primary-900/30 p-3 rounded-lg ml-auto max-w-[80%]">
                        <p className="text-sm text-primary-700 dark:text-primary-300">
                          1. ROI within 3 months based on similar clients<br />
                          2. Flexible payment options available<br />
                          3. Cost comparison with current solution
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute -top-6 -right-6 w-12 h-12 bg-primary-200 dark:bg-primary-800 rounded-full"></div>
              <div className="absolute -bottom-4 -left-4 w-8 h-8 bg-primary-300 dark:bg-primary-700 rounded-full"></div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

export default Hero
