/**
 * useModalWindow.ts
 *
 * React hook for managing modal windows that render in separate BrowserWindow instances.
 * This allows modals to break free from the main window's size constraints.
 */

import { useState, useEffect, useCallback } from 'react'

export interface ModalWindowOptions {
  width?: number
  height?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  resizable?: boolean
  title?: string
  modal?: boolean
  alwaysOnTop?: boolean
  center?: boolean
}

export interface UseModalWindowReturn {
  isOpen: boolean
  openModal: (options?: ModalWindowOptions) => Promise<boolean>
  closeModal: () => Promise<boolean>
  updateOptions: (options: Partial<ModalWindowOptions>) => Promise<boolean>
  focusModal: () => Promise<boolean>
  isLoading: boolean
  error: string | null
}

/**
 * Hook for managing a modal window
 * @param modalId Unique identifier for the modal window
 * @param defaultOptions Default options for the modal window
 */
export function useModalWindow(
  modalId: string,
  defaultOptions: ModalWindowOptions = {}
): UseModalWindowReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if modal is already open on mount
  useEffect(() => {
    const checkModalStatus = async () => {
      try {
        const result = await window.electronAPI.isModalOpen(modalId)
        if (result.success && result.isOpen) {
          setIsOpen(true)
        }
      } catch (err) {
        console.error(`Failed to check modal status for ${modalId}:`, err)
      }
    }

    checkModalStatus()
  }, [modalId])

  const openModal = useCallback(async (options: ModalWindowOptions = {}): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      // Merge default options with provided options
      const finalOptions = { ...defaultOptions, ...options }

      const result = await window.electronAPI.createModal(modalId, finalOptions)
      
      if (result.success) {
        setIsOpen(true)
        return true
      } else {
        setError(result.error || 'Failed to create modal window')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error(`Failed to open modal ${modalId}:`, err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [modalId, defaultOptions])

  const closeModal = useCallback(async (): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await window.electronAPI.closeModal(modalId)
      
      if (result.success) {
        setIsOpen(false)
        return true
      } else {
        setError(result.error || 'Failed to close modal window')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error(`Failed to close modal ${modalId}:`, err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [modalId])

  const updateOptions = useCallback(async (options: Partial<ModalWindowOptions>): Promise<boolean> => {
    setError(null)

    try {
      const result = await window.electronAPI.updateModalOptions(modalId, options)
      
      if (result.success) {
        return true
      } else {
        setError(result.error || 'Failed to update modal options')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error(`Failed to update modal options for ${modalId}:`, err)
      return false
    }
  }, [modalId])

  const focusModal = useCallback(async (): Promise<boolean> => {
    setError(null)

    try {
      const result = await window.electronAPI.focusModal(modalId)
      
      if (result.success) {
        return true
      } else {
        setError(result.error || 'Failed to focus modal window')
        return false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error(`Failed to focus modal ${modalId}:`, err)
      return false
    }
  }, [modalId])

  return {
    isOpen,
    openModal,
    closeModal,
    updateOptions,
    focusModal,
    isLoading,
    error
  }
}

/**
 * Hook for managing multiple modal windows
 */
export function useModalWindows() {
  const [openModals, setOpenModals] = useState<Set<string>>(new Set())

  const createModal = useCallback(async (
    modalId: string, 
    options: ModalWindowOptions = {}
  ): Promise<boolean> => {
    try {
      const result = await window.electronAPI.createModal(modalId, options)
      
      if (result.success) {
        setOpenModals(prev => new Set(prev).add(modalId))
        return true
      }
      return false
    } catch (err) {
      console.error(`Failed to create modal ${modalId}:`, err)
      return false
    }
  }, [])

  const closeModal = useCallback(async (modalId: string): Promise<boolean> => {
    try {
      const result = await window.electronAPI.closeModal(modalId)
      
      if (result.success) {
        setOpenModals(prev => {
          const newSet = new Set(prev)
          newSet.delete(modalId)
          return newSet
        })
        return true
      }
      return false
    } catch (err) {
      console.error(`Failed to close modal ${modalId}:`, err)
      return false
    }
  }, [])

  const closeAllModals = useCallback(async (): Promise<void> => {
    const promises = Array.from(openModals).map(modalId => closeModal(modalId))
    await Promise.all(promises)
  }, [openModals, closeModal])

  const isModalOpen = useCallback((modalId: string): boolean => {
    return openModals.has(modalId)
  }, [openModals])

  return {
    openModals: Array.from(openModals),
    createModal,
    closeModal,
    closeAllModals,
    isModalOpen
  }
}
