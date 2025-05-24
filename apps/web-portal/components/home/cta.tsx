"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

const CTA = () => {
  return (
    <section className="py-20 bg-primary-500 dark:bg-primary-600">
      <div className="container mx-auto px-4">
        <motion.div 
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Sales Performance?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join the growing number of sales professionals who are closing more deals with Closezly as their AI-powered co-pilot.
          </p>
          <motion.div 
            className="flex flex-col sm:flex-row justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/signup">
              <Button size="lg" className="bg-white text-primary-600 hover:bg-primary-50">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button variant="outline" size="lg" className="border-white text-white hover:bg-primary-400">
                Schedule a Demo
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

export default CTA
