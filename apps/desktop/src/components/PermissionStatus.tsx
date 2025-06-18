/**
 * PermissionStatus.tsx
 *
 * Compact permission status indicator component that shows current
 * permission status and provides quick access to permission management.
 */

import React, { useState, useEffect } from 'react'
import { Monitor, Mic, AlertTriangle, CheckCircle, Settings } from 'lucide-react'

interface PermissionStatus {
  granted: boolean
  status: string
  userGuidance?: string
  canRequest: boolean
}

interface PermissionStatusProps {
  onOpenPermissionDialog?: () => void
  className?: string
  showLabels?: boolean
  compact?: boolean
}

const PermissionStatusComponent: React.FC<PermissionStatusProps> = ({
  onOpenPermissionDialog,
  className = '',
  showLabels = true,
  compact = false
}) => {
  const [permissions, setPermissions] = useState<Record<string, PermissionStatus>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkPermissions()
    
    // Listen for permission changes
    const unsubscribe = window.electronAPI.onPermissionChanged((data) => {
      setPermissions(prev => ({
        ...prev,
        [data.mediaType]: {
          granted: data.status === 'granted',
          status: data.status,
          userGuidance: '',
          canRequest: data.status === 'not-determined'
        }
      }))
    })

    return unsubscribe
  }, [])

  const checkPermissions = async () => {
    setIsLoading(true)
    try {
      const result = await window.electronAPI.checkAllPermissions()
      if (result.success) {
        // Transform backend data to frontend format
        const transformedPermissions: Record<string, PermissionStatus> = {}
        Object.entries(result.results).forEach(([mediaType, backendResult]: [string, any]) => {
          transformedPermissions[mediaType] = {
            granted: backendResult.status === 'granted',
            status: backendResult.status,
            userGuidance: backendResult.userGuidance,
            canRequest: backendResult.canRequest
          }
        })
        setPermissions(transformedPermissions)
      }
    } catch (error) {
      console.error('Failed to check permissions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getPermissionIcon = (mediaType: string, status: PermissionStatus) => {
    const IconComponent = mediaType === 'screen' ? Monitor : Mic
    const size = compact ? 'w-4 h-4' : 'w-5 h-5'
    
    if (status.granted) {
      return <IconComponent className={`${size} text-green-500`} />
    } else {
      return (
        <div className="relative">
          <IconComponent className={`${size} text-gray-400`} />
          <AlertTriangle className="w-3 h-3 text-orange-500 absolute -top-1 -right-1" />
        </div>
      )
    }
  }

  const getStatusColor = (status: PermissionStatus) => {
    if (status.granted) return 'text-green-600'
    if (status.status === 'denied') return 'text-red-600'
    return 'text-orange-600'
  }

  const getStatusText = (status: PermissionStatus) => {
    if (status.granted) return 'Granted'
    if (status.status === 'denied') return 'Denied'
    if (status.status === 'not-determined') return 'Not Set'
    return 'Unknown'
  }

  const hasPermissionIssues = Object.values(permissions).some(p => !p.granted)

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="animate-pulse flex space-x-2">
          <div className="w-5 h-5 bg-gray-300 rounded"></div>
          <div className="w-5 h-5 bg-gray-300 rounded"></div>
        </div>
        {showLabels && !compact && (
          <span className="text-sm text-gray-500">Checking permissions...</span>
        )}
      </div>
    )
  }

  if (compact) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        {Object.entries(permissions).map(([mediaType, status]) => (
          <div key={mediaType} className="relative">
            {getPermissionIcon(mediaType, status)}
          </div>
        ))}
        {hasPermissionIssues && onOpenPermissionDialog && (
          <button
            onClick={onOpenPermissionDialog}
            className="ml-1 p-1 text-orange-500 hover:text-orange-600 transition-colors"
            title="Fix permission issues"
          >
            <Settings className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">Permissions</h3>
        {hasPermissionIssues && onOpenPermissionDialog && (
          <button
            onClick={onOpenPermissionDialog}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Fix Issues
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {Object.entries(permissions).map(([mediaType, status]) => {
          const permissionName = mediaType === 'screen' ? 'Screen Recording' : 'Microphone'
          
          return (
            <div key={mediaType} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getPermissionIcon(mediaType, status)}
                {showLabels && (
                  <span className="text-sm text-gray-600">{permissionName}</span>
                )}
              </div>
              <span className={`text-xs font-medium ${getStatusColor(status)}`}>
                {getStatusText(status)}
              </span>
            </div>
          )
        })}
      </div>

      {hasPermissionIssues && (
        <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
          <div className="flex items-start">
            <AlertTriangle className="w-3 h-3 text-orange-500 mt-0.5 mr-1 flex-shrink-0" />
            <div>
              <p className="text-orange-800 font-medium">Limited Functionality</p>
              <p className="text-orange-700 mt-1">
                Some AI features may not work without proper permissions.
              </p>
              {onOpenPermissionDialog && (
                <button
                  onClick={onOpenPermissionDialog}
                  className="text-orange-600 hover:text-orange-700 font-medium mt-1 underline"
                >
                  Grant Permissions
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {!hasPermissionIssues && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
          <div className="flex items-center">
            <CheckCircle className="w-3 h-3 text-green-500 mr-1" />
            <span className="text-green-800 font-medium">All permissions granted</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default PermissionStatusComponent
