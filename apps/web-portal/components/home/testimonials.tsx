"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Star } from "lucide-react"

const testimonials = [
  {
    quote: "Closezly has transformed our sales process. The real-time guidance during calls has helped our team address objections more effectively and close 30% more deals.",
    author: "Sarah Johnson",
    position: "VP of Sales, TechCorp",
    rating: 5
  },
  {
    quote: "The CRM integration is seamless, and the post-call analytics provide insights we never had before. Our sales team's performance has improved dramatically.",
    author: "Michael Chen",
    position: "Sales Director, GrowthX",
    rating: 5
  },
  {
    quote: "As a sales rep, having Closezly as my co-pilot gives me confidence in every call. It's like having a senior sales mentor with me at all times.",
    author: "Jessica Rodriguez",
    position: "Senior Account Executive, SaaS Solutions",
    rating: 5
  },
  {
    quote: "The custom knowledge retrieval feature has been a game-changer. No more scrambling to find product details or competitive information during important calls.",
    author: "David Wilson",
    position: "Enterprise Sales Manager, CloudTech",
    rating: 4
  }
]

const Testimonials = () => {
  return (
    <section className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            What Our Customers Say
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Hear from sales professionals who have transformed their results with Closezly.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="flex mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-5 w-5 ${i < testimonial.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                      />
                    ))}
                  </div>
                  <blockquote className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                    "{testimonial.quote}"
                  </blockquote>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{testimonial.author}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.position}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
