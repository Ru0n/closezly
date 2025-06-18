/**
 * PermissionDialog.tsx
 *
 * User-friendly permission dialog component that guides users through
 * granting screen recording and microphone permissions for AI features.
 */

import React, { useState, useEffect } from 'react'
import { X, Monitor, Mic, AlertCircle, CheckCircle, ExternalLink, Settings } from 'lucide-react'

interface PermissionStatus {
  granted: boolean
  status: string
  userGuidance?: string
  canRequest: boolean
}

interface PermissionDialogProps {
  isOpen: boolean
  onClose: () => void
  onPermissionGranted?: () => void
  requiredPermissions?: ('screen' | 'microphone')[]
  showOnboarding?: boolean
}

const PermissionDialog: React.FC<PermissionDialogProps> = ({
  isOpen,
  onClose,
  onPermissionGranted,
  requiredPermissions = ['screen'],
  showOnboarding = false
}) => {
  const [permissions, setPermissions] = useState<Record<string, PermissionStatus>>({})
  const [isChecking, setIsChecking] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Check permissions on mount and when dialog opens
  useEffect(() => {
    if (isOpen) {
      checkAllPermissions()
    }
  }, [isOpen])

  const checkAllPermissions = async () => {
    setIsChecking(true)
    try {
      const result = await window.electronAPI.checkAllPermissions()
      if (result.success) {
        // Convert the PermissionHelper results to our component's expected format
        const convertedResults: Record<string, PermissionStatus> = {}
        Object.entries(result.results).forEach(([mediaType, permResult]: [string, any]) => {
          convertedResults[mediaType] = {
            granted: permResult.status === 'granted',
            status: permResult.status,
            userGuidance: permResult.userGuidance,
            canRequest: permResult.canRequest
          }
        })
        setPermissions(convertedResults)
      }
    } catch (error) {
      console.error('Failed to check permissions:', error)
    } finally {
      setIsChecking(false)
    }
  }

  const requestPermission = async (mediaType: string) => {
    setIsChecking(true)
    try {
      const result = await window.electronAPI.requestPermission(mediaType)
      if (result.success && result.status) {
        // Update the specific permission status
        setPermissions(prev => ({
          ...prev,
          [mediaType]: {
            granted: result.status === 'granted',
            status: result.status || 'unknown',
            userGuidance: result.userGuidance,
            canRequest: result.canRequest || false
          }
        }))

        // If permission was granted, notify parent
        if (result.status === 'granted' && onPermissionGranted) {
          onPermissionGranted()
        }

        // Refresh all permissions to get updated status
        await checkAllPermissions()
      }
    } catch (error) {
      console.error(`Failed to request ${mediaType} permission:`, error)
    } finally {
      setIsChecking(false)
    }
  }

  const openSystemPreferences = () => {
    window.electronAPI.showPermissionStatus()
  }

  const openSpecificPrivacySettings = (mediaType: string) => {
    window.electronAPI.openSpecificPrivacySettings(mediaType)
  }

  const getPermissionIcon = (mediaType: string, status: PermissionStatus) => {
    const IconComponent = mediaType === 'screen' ? Monitor : Mic
    const iconColor = status.granted ? 'text-green-500' : 'text-orange-500'
    
    return <IconComponent className={`w-6 h-6 ${iconColor}`} />
  }

  const getPermissionStatusText = (status: PermissionStatus) => {
    if (status.granted) return 'Granted'
    if (status.status === 'denied') return 'Denied'
    if (status.status === 'not-determined') return 'Not Set'
    return 'Unknown'
  }

  const allRequiredPermissionsGranted = requiredPermissions.every(
    permission => permissions[permission]?.granted
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {showOnboarding ? 'Welcome to Closezly AI' : 'Permissions Required'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {showOnboarding && (
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Closezly needs access to your screen and microphone to provide AI-powered sales assistance.
              </p>
            </div>
          )}

          {/* Permission Status */}
          <div className="space-y-4">
            {requiredPermissions.map(permission => {
              const status = permissions[permission]
              const permissionName = permission === 'screen' ? 'Screen Recording' : 'Microphone'
              
              return (
                <div key={permission} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      {getPermissionIcon(permission, status || { granted: false, status: 'unknown', canRequest: false })}
                      <div className="ml-3">
                        <h3 className="font-medium text-gray-900">{permissionName}</h3>
                        <p className="text-sm text-gray-500">
                          Status: {status ? getPermissionStatusText(status) : 'Checking...'}
                        </p>
                      </div>
                    </div>
                    {status?.granted && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>

                  {status && !status.granted && (
                    <div className="space-y-3">
                      {status.userGuidance && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          {status.userGuidance}
                        </p>
                      )}
                      
                      <div className="flex space-x-3">
                        {status.canRequest && (
                          <button
                            onClick={() => requestPermission(permission)}
                            disabled={isChecking}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
                          >
                            {isChecking ? 'Requesting...' : 'Request Permission'}
                          </button>
                        )}

                        <button
                          onClick={() => openSpecificPrivacySettings(permission)}
                          className="px-4 py-2 bg-gray-100 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium flex items-center transition-colors"
                        >
                          <Settings className="w-4 h-4 mr-2" />
                          Open {permission === 'screen' ? 'Screen Recording' : 'Microphone'} Settings
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* macOS Specific Instructions */}
          {(requiredPermissions.includes('screen') && !permissions.screen?.granted) ||
           (requiredPermissions.includes('microphone') && !permissions.microphone?.granted) && (
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-2">Quick Setup</h4>
                  <p className="text-sm text-blue-800">
                    Click the "Open Settings" button above to go directly to the permission settings.
                    Enable Closezly in the list, then restart the app.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t">
            <button
              onClick={checkAllPermissions}
              disabled={isChecking}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {isChecking ? 'Checking...' : 'Refresh Status'}
            </button>

            <div className="flex space-x-3">
              {!allRequiredPermissionsGranted && (
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 text-sm font-medium transition-colors"
                >
                  Skip for Now
                </button>
              )}

              <button
                onClick={onClose}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                  allRequiredPermissionsGranted
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                }`}
              >
                {allRequiredPermissionsGranted ? 'Continue' : 'Done'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PermissionDialog
