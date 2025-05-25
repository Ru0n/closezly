"use client"

import React from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Header from "@/components/layout/header"
import Footer from "@/components/layout/footer"
import { Users, Target, Lightbulb, Award, ArrowRight } from "lucide-react"
import Link from "next/link"

const About = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
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

  const itemFadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  }

  const values = [
    {
      icon: <Target className="h-8 w-8 text-primary-500" />,
      title: "Customer Success",
      description: "We're obsessed with helping sales professionals achieve their goals and exceed their targets."
    },
    {
      icon: <Lightbulb className="h-8 w-8 text-primary-500" />,
      title: "Innovation",
      description: "We continuously push the boundaries of AI technology to create cutting-edge sales solutions."
    },
    {
      icon: <Users className="h-8 w-8 text-primary-500" />,
      title: "Collaboration",
      description: "We believe the best results come from working together with our customers and partners."
    },
    {
      icon: <Award className="h-8 w-8 text-primary-500" />,
      title: "Excellence",
      description: "We maintain the highest standards in everything we do, from product quality to customer service."
    }
  ]

  const team = [
    {
      name: "Sarah Johnson",
      role: "CEO & Co-Founder",
      description: "Former VP of Sales at TechCorp with 15+ years in B2B sales leadership."
    },
    {
      name: "Michael Chen",
      role: "CTO & Co-Founder",
      description: "AI researcher and former engineering lead at major tech companies."
    },
    {
      name: "Emily Rodriguez",
      role: "Head of Product",
      description: "Product strategist with deep expertise in sales technology and user experience."
    },
    {
      name: "David Kim",
      role: "Head of Sales",
      description: "Sales veteran who understands the challenges of modern B2B selling."
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
                About Closezly
              </motion.div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Empowering Sales Teams with <span className="text-primary-500">AI Intelligence</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
                We&apos;re on a mission to transform how B2B sales professionals work by providing them with an AI-powered co-pilot that delivers real-time guidance, insights, and support during every customer interaction.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
              >
                <div className="inline-block rounded-full bg-primary-100 dark:bg-primary-900 px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-300">
                  Our Story
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
                  Born from Real Sales Challenges
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  Closezly was founded by a team of sales veterans and AI experts who experienced firsthand the challenges of modern B2B selling. We saw talented sales professionals struggling with information overload, complex product portfolios, and the pressure to deliver personalized experiences at scale.
                </p>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                  We knew there had to be a better way. By combining our deep understanding of sales processes with cutting-edge AI technology, we created Closezly - an intelligent co-pilot that helps sales professionals perform at their best during every customer interaction.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link href="/signup">
                    <Button size="lg" className="group">
                      Join Our Mission
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Link href="/demo">
                    <Button variant="outline" size="lg">
                      See How It Works
                    </Button>
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                <div className="bg-primary-500/10 dark:bg-primary-500/5 rounded-3xl p-8">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Sales Performance</div>
                        <div className="text-sm text-green-600 dark:text-green-400">+47% improvement</div>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
                        <div className="h-2 bg-gradient-to-r from-primary-500 to-green-500 rounded-full w-3/4"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">250+</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Sales Teams</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-gray-900 dark:text-white">98%</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">Satisfaction</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 bg-gray-50 dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <div className="inline-block rounded-full bg-primary-100 dark:bg-primary-900 px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 mb-6">
                Our Values
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                What Drives Us Forward
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Our core values guide everything we do, from product development to customer relationships.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-8"
            >
              {values.map((value, index) => (
                <motion.div key={index} variants={itemFadeIn}>
                  <Card className="h-full border-2 hover:border-primary-500/50 transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="mb-4">{value.icon}</div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{value.title}</h3>
                      <p className="text-gray-600 dark:text-gray-300">{value.description}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-20 bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeIn}
              className="text-center max-w-3xl mx-auto mb-16"
            >
              <div className="inline-block rounded-full bg-primary-100 dark:bg-primary-900 px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 mb-6">
                Our Team
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Meet the People Behind Closezly
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                A diverse team of sales experts, AI researchers, and product innovators working together to revolutionize B2B sales.
              </p>
            </motion.div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {team.map((member, index) => (
                <motion.div key={index} variants={itemFadeIn}>
                  <Card className="text-center hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 mx-auto mb-4 flex items-center justify-center text-white text-2xl font-bold">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{member.name}</h3>
                      <p className="text-primary-500 font-medium mb-3">{member.role}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{member.description}</p>
                    </CardContent>
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
                Ready to Transform Your Sales Performance?
              </h2>
              <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
                Join hundreds of sales professionals who are already using Closezly to close more deals and exceed their targets.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-primary-600 hover:bg-primary-50">
                    Get Started Free
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

export default About
