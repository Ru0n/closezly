"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Plus, X } from "lucide-react"

interface FloatingAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color?: string
}

interface FloatingActionButtonProps {
  actions?: FloatingAction[]
  mainIcon?: React.ReactNode
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  size?: "sm" | "md" | "lg"
  className?: string
}

const positionClasses = {
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6", 
  "top-right": "top-6 right-6",
  "top-left": "top-6 left-6"
}

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-14 h-14",
  lg: "w-16 h-16"
}

export function FloatingActionButton({
  actions = [],
  mainIcon = <Plus className="h-6 w-6" />,
  position = "bottom-right",
  size = "md",
  className
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleOpen = () => setIsOpen(!isOpen)

  return (
    <div className={cn("fixed z-50", positionClasses[position], className)}>
      {/* Action Items */}
      <AnimatePresence>
        {isOpen && actions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-16 right-0 space-y-3"
          >
            {actions.map((action, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  transition: { delay: index * 0.1 }
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0, 
                  y: 20,
                  transition: { delay: (actions.length - index - 1) * 0.05 }
                }}
                className="flex items-center space-x-3"
              >
                {/* Action Label */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-2 rounded-lg text-sm font-medium shadow-lg"
                >
                  {action.label}
                </motion.div>
                
                {/* Action Button */}
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={action.onClick}
                  className={cn(
                    "w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white transition-colors",
                    action.color || "bg-primary-500 hover:bg-primary-600"
                  )}
                >
                  {action.icon}
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleOpen}
        className={cn(
          "bg-primary-500 hover:bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center transition-colors",
          sizeClasses[size]
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X className="h-6 w-6" /> : mainIcon}
        </motion.div>
      </motion.button>

      {/* Ripple Effect */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full bg-primary-500 opacity-20 pointer-events-none",
          sizeClasses[size]
        )}
        initial={{ scale: 1 }}
        animate={{ scale: isOpen ? 1.2 : 1 }}
        transition={{ duration: 0.3 }}
      />
    </div>
  )
}

// Simple floating action button without menu
interface SimpleFloatingActionButtonProps {
  icon: React.ReactNode
  onClick: () => void
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  size?: "sm" | "md" | "lg"
  color?: string
  tooltip?: string
  className?: string
}

export function SimpleFloatingActionButton({
  icon,
  onClick,
  position = "bottom-right",
  size = "md",
  color = "bg-primary-500 hover:bg-primary-600",
  tooltip,
  className
}: SimpleFloatingActionButtonProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className={cn("fixed z-50", positionClasses[position], className)}>
      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && tooltip && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            className="absolute bottom-16 right-0 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-3 py-2 rounded-lg text-sm font-medium shadow-lg whitespace-nowrap"
          >
            {tooltip}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={cn(
          "text-white rounded-full shadow-lg flex items-center justify-center transition-colors",
          sizeClasses[size],
          color
        )}
      >
        {icon}
      </motion.button>
    </div>
  )
}
