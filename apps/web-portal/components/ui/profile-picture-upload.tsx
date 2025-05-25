"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { Camera, Upload, X, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { Button } from "./button"
import { cn } from "@/lib/utils"

export interface ProfilePictureUploadProps {
  currentImage?: string
  onImageChange: (file: File | null) => void
  onImageRemove: () => void
  className?: string
  size?: "sm" | "md" | "lg"
  userName?: string
}

const ProfilePictureUpload = React.forwardRef<HTMLDivElement, ProfilePictureUploadProps>(
  ({ currentImage, onImageChange, onImageRemove, className, size = "lg", userName }, ref) => {
    const [preview, setPreview] = React.useState<string | null>(null)
    const [isDragging, setIsDragging] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const sizeClasses = {
      sm: "h-16 w-16",
      md: "h-24 w-24", 
      lg: "h-32 w-32"
    }

    const handleFileSelect = (file: File) => {
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setPreview(e.target?.result as string)
        }
        reader.readAsDataURL(file)
        onImageChange(file)
      }
    }

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) {
        handleFileSelect(file)
      }
    }

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
    }

    const handleRemoveImage = () => {
      setPreview(null)
      onImageRemove()
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    const displayImage = preview || currentImage
    const initials = userName ? userName.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'

    return (
      <div ref={ref} className={cn("flex flex-col items-center space-y-4", className)}>
        <div className="relative">
          <motion.div
            className={cn(
              "relative group cursor-pointer",
              sizeClasses[size]
            )}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <Avatar className={cn("h-full w-full", isDragging && "ring-2 ring-primary ring-offset-2")}>
              <AvatarImage src={displayImage} alt="Profile picture" />
              <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {displayImage ? null : initials}
              </AvatarFallback>
            </Avatar>
            
            {/* Overlay */}
            <div className={cn(
              "absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
              isDragging && "opacity-100"
            )}>
              <Camera className="h-6 w-6 text-white" />
            </div>
          </motion.div>

          {/* Remove button */}
          {displayImage && (
            <motion.button
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
              onClick={(e) => {
                e.stopPropagation()
                handleRemoveImage()
              }}
            >
              <X className="h-3 w-3" />
            </motion.button>
          )}
        </div>

        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Profile Picture
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            JPG, PNG or WebP (max 5MB)
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
    )
  }
)

ProfilePictureUpload.displayName = "ProfilePictureUpload"

export { ProfilePictureUpload }
