"use client"

import { motion, useInView } from "framer-motion"
import { useRef, ReactNode } from "react"

interface ScrollRevealProps {
  children: ReactNode
  direction?: "up" | "down" | "left" | "right" | "scale" | "fade"
  delay?: number
  duration?: number
  distance?: number
  className?: string
  once?: boolean
}

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.6,
  distance = 50,
  className,
  once = true
}: ScrollRevealProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once, margin: "-100px" })

  const variants = {
    hidden: {
      opacity: 0,
      y: direction === "up" ? distance : direction === "down" ? -distance : 0,
      x: direction === "left" ? distance : direction === "right" ? -distance : 0,
      scale: direction === "scale" ? 0.8 : 1,
    },
    visible: {
      opacity: 1,
      y: 0,
      x: 0,
      scale: 1,
      transition: {
        duration,
        delay,
        ease: [0.25, 0.25, 0.25, 0.75],
      },
    },
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger children animation
interface ScrollRevealStaggerProps {
  children: ReactNode[]
  staggerDelay?: number
  className?: string
}

export function ScrollRevealStagger({
  children,
  staggerDelay = 0.1,
  className
}: ScrollRevealStaggerProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.25, 0.25, 0.75],
      },
    },
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={containerVariants}
      className={className}
    >
      {children.map((child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

// Parallax scroll effect
interface ParallaxScrollProps {
  children: ReactNode
  speed?: number
  className?: string
}

export function ParallaxScroll({
  children,
  speed = 0.5,
  className
}: ParallaxScrollProps) {
  const ref = useRef(null)

  return (
    <motion.div
      ref={ref}
      style={{
        y: useInView(ref) ? 0 : speed * 100,
      }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
