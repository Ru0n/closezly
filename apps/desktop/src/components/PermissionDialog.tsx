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
        setPermissions(result.results)
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
      if (result.success) {
        // Update the specific permission status
        setPermissions(prev => ({
          ...prev,
          [mediaType]: {
            granted: result.status === 'granted',
            status: result.status,
            userGuidance: result.userGuidance,
            canRequest: result.canRequest
          }
        }))

        // If permission was granted, notify parent
        if (result.status === 'granted' && onPermissionGranted) {
          onPermissionGranted()
        }
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
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
                To provide you with the best AI-powered sales assistance, Closezly needs access to your screen and microphone.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-blue-900 mb-1">Why we need these permissions:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Screen Recording:</strong> Analyze what's on your screen for contextual AI suggestions</li>
                      <li>• <strong>Microphone:</strong> Process conversation audio for real-time assistance</li>
                    </ul>
                  </div>
                </div>
              </div>
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
                      
                      <div className="flex space-x-2">
                        {status.canRequest && (
                          <button
                            onClick={() => requestPermission(permission)}
                            disabled={isChecking}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {isChecking ? 'Requesting...' : 'Request Permission'}
                          </button>
                        )}
                        
                        <button
                          onClick={openSystemPreferences}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm flex items-center"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Open Settings
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* macOS Specific Instructions */}
          {requiredPermissions.includes('screen') && !permissions.screen?.granted && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-yellow-900 mb-2">Manual Setup Required (macOS)</h4>
                  <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
                    <li>Open System Preferences</li>
                    <li>Go to Security & Privacy</li>
                    <li>Click on the Privacy tab</li>
                    <li>Select "Screen Recording" from the list</li>
                    <li>Check the box next to Closezly</li>
                    <li>Restart the application</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t">
            <button
              onClick={checkAllPermissions}
              disabled={isChecking}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium disabled:opacity-50"
            >
              {isChecking ? 'Checking...' : 'Refresh Status'}
            </button>
            
            <div className="flex space-x-3">
              {!allRequiredPermissionsGranted && (
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm"
                >
                  Skip for Now
                </button>
              )}
              
              <button
                onClick={onClose}
                className={`px-4 py-2 rounded text-sm font-medium ${
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
