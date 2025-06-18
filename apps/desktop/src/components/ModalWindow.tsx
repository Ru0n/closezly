/**
 * ModalWindow.tsx
 *
 * A React component that renders content in a separate BrowserWindow instance,
 * allowing modals to break free from the main window's size constraints.
 */

import React, { useEffect, useState } from 'react'
import { useModalWindow, ModalWindowOptions } from '../hooks/useModalWindow'

export interface ModalWindowProps {
  modalId: string
  isOpen: boolean
  onClose: () => void
  options?: ModalWindowOptions
  children?: React.ReactNode
  title?: string
  className?: string
}

/**
 * ModalWindow component that creates a separate BrowserWindow for modal content
 */
const ModalWindow: React.FC<ModalWindowProps> = ({
  modalId,
  isOpen,
  onClose,
  options = {},
  children,
  title,
  className = ''
}) => {
  const [isModalContentReady, setIsModalContentReady] = useState(false)
  
  const {
    isOpen: modalIsOpen,
    openModal,
    closeModal,
    updateOptions,
    isLoading,
    error
  } = useModalWindow(modalId, {
    width: 800,
    height: 600,
    resizable: true,
    modal: true,
    center: true,
    title: title || 'Closezly',
    ...options
  })

  // Handle opening/closing the modal based on isOpen prop
  useEffect(() => {
    if (isOpen && !modalIsOpen && !isLoading) {
      openModal(options).then((success) => {
        if (success) {
          setIsModalContentReady(true)
        }
      })
    } else if (!isOpen && modalIsOpen) {
      closeModal().then(() => {
        setIsModalContentReady(false)
        onClose()
      })
    }
  }, [isOpen, modalIsOpen, isLoading, openModal, closeModal, onClose, options])

  // Update options when they change
  useEffect(() => {
    if (modalIsOpen && options) {
      updateOptions(options)
    }
  }, [modalIsOpen, options, updateOptions])

  // Handle errors
  useEffect(() => {
    if (error) {
      console.error(`Modal window error for ${modalId}:`, error)
    }
  }, [error, modalId])

  // Check if this is the modal window instance
  const isModalWindow = typeof window !== 'undefined' && 
    new URLSearchParams(window.location.search).get('modal') === modalId

  // If this is the modal window instance, render the content
  if (isModalWindow) {
    return (
      <div className={`modal-window-content ${className}`}>
        <style>{`
          body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
              sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            background-color: #ffffff;
          }
          
          .modal-window-content {
            width: 100vw;
            height: 100vh;
            overflow: auto;
          }
          
          /* Ensure proper styling for modal content */
          * {
            box-sizing: border-box;
          }
        `}</style>
        {children}
      </div>
    )
  }

  // If this is the main window, don't render anything visible
  // The modal content will be rendered in the separate window
  return null
}

export default ModalWindow

/**
 * Hook to detect if the current window is a modal window
 */
export function useIsModalWindow(modalId?: string): boolean {
  const [isModal, setIsModal] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlModalId = new URLSearchParams(window.location.search).get('modal')
      setIsModal(modalId ? urlModalId === modalId : !!urlModalId)
    }
  }, [modalId])

  return isModal
}

/**
 * Hook to get the current modal ID from URL parameters
 */
export function useModalId(): string | null {
  const [modalId, setModalId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlModalId = new URLSearchParams(window.location.search).get('modal')
      setModalId(urlModalId)
    }
  }, [])

  return modalId
}

/**
 * Component that only renders its children if this is NOT a modal window
 */
export const MainWindowOnly: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isModal = useIsModalWindow()
  
  if (isModal) {
    return null
  }
  
  return <>{children}</>
}

/**
 * Component that only renders its children if this IS a modal window
 */
export const ModalWindowOnly: React.FC<{ 
  children: React.ReactNode
  modalId?: string 
}> = ({ children, modalId }) => {
  const isModal = useIsModalWindow(modalId)
  
  if (!isModal) {
    return null
  }
  
  return <>{children}</>
}
