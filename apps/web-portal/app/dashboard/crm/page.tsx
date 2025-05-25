"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Link as LinkIcon, CheckCircle, AlertCircle, ExternalLink, Unlink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { createClient } from "@/lib/supabase/client"
import { disconnectCrmAction } from "@/lib/actions"

interface CrmConnection {
  id: string
  crm_type: string
  status: string
  connected_email?: string
  connected_at?: string
  last_sync?: string
}

const CRM_CONFIGS = {
  salesforce: {
    name: "Salesforce",
    description: "Connect your Salesforce CRM to get real-time contact and deal information during calls",
    logo: "🏢", // In a real app, you'd use proper logos
    features: [
      "Access contact information",
      "View deal pipeline",
      "Update opportunity status",
      "Log call activities"
    ]
  },
  hubspot: {
    name: "HubSpot",
    description: "Integrate with HubSpot to access your contacts, deals, and company information",
    logo: "🎯",
    features: [
      "Contact and company data",
      "Deal tracking",
      "Activity logging",
      "Pipeline insights"
    ]
  }
}

export default function CrmPage() {
  const [connections, setConnections] = useState<CrmConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<string | null>(null)

  useEffect(() => {
    fetchConnections()
  }, [])

  const fetchConnections = async () => {
    try {
      // For now, simulate CRM connections data
      // In a real app, this would fetch from your backend API
      setConnections([
        // Example: connected Salesforce
        // {
        //   id: '1',
        //   crm_type: 'salesforce',
        //   status: 'connected',
        //   connected_email: 'user@company.com',
        //   connected_at: new Date().toISOString(),
        //   last_sync: new Date().toISOString()
        // }
      ])
    } catch (error) {
      console.error('Error fetching CRM connections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (crmType: string) => {
    setConnecting(crmType)
    try {
      // In a real app, this would redirect to the backend OAuth initiation URL
      // For now, just simulate the connection process
      console.log(`Connecting to ${crmType}...`)

      // Simulate OAuth flow
      await new Promise(resolve => setTimeout(resolve, 2000))

      // For demo purposes, show success message
      alert(`${CRM_CONFIGS[crmType as keyof typeof CRM_CONFIGS].name} connection would be initiated here. This would redirect to the OAuth flow.`)

      // In a real implementation:
      // window.location.href = `/api/v1/crm/connect/${crmType}`
    } catch (error) {
      console.error('Error connecting CRM:', error)
      alert('Failed to connect CRM')
    } finally {
      setConnecting(null)
    }
  }

  const handleDisconnect = async (crmType: string) => {
    if (!confirm(`Are you sure you want to disconnect ${CRM_CONFIGS[crmType as keyof typeof CRM_CONFIGS].name}?`)) {
      return
    }

    try {
      const result = await disconnectCrmAction({ crmType })
      if (result?.data?.success) {
        await fetchConnections()
      } else {
        throw new Error('Failed to disconnect CRM')
      }
    } catch (error) {
      console.error('Error disconnecting CRM:', error)
      alert('Failed to disconnect CRM')
    }
  }

  const handleTestConnection = async (crmType: string) => {
    try {
      // Simulate connection test
      console.log(`Testing ${crmType} connection...`)
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert('Connection test successful!')
    } catch (error) {
      console.error('Error testing connection:', error)
      alert('Connection test failed')
    }
  }

  const getConnection = (crmType: string) => {
    return connections.find(conn => conn.crm_type === crmType)
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          CRM Integrations
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Connect your CRM systems to get contextual information during sales calls
        </p>
      </div>

      <div className="space-y-6">
        {Object.entries(CRM_CONFIGS).map(([crmType, config]) => {
          const connection = getConnection(crmType)
          const isConnected = connection?.status === 'connected'
          const isConnecting = connecting === crmType

          return (
            <motion.div
              key={crmType}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <Card className={isConnected ? 'border-green-200 bg-green-50/50 dark:bg-green-900/10' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{config.logo}</div>
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>{config.name}</span>
                          {isConnected && (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {config.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Connection Status */}
                  {isConnected && connection && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Connected Account:</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {connection.connected_email}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Connected:</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {connection.connected_at && new Date(connection.connected_at).toLocaleDateString()}
                          </span>
                        </div>
                        {connection.last_sync && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Last Sync:</span>
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {new Date(connection.last_sync).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Features */}
                  <div>
                    <h4 className="font-medium mb-3">Available Features:</h4>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {config.features.map((feature, index) => (
                        <li key={index} className="flex items-center space-x-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="flex items-center space-x-3">
                    {isConnected ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => handleTestConnection(crmType)}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Test Connection
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDisconnect(crmType)}
                        >
                          <Unlink className="mr-2 h-4 w-4" />
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleConnect(crmType)}
                        disabled={isConnecting}
                        className="w-full sm:w-auto"
                      >
                        {isConnecting ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Connect {config.name}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Help Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5" />
            <span>Need Help?</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>
              <strong>Connection Issues:</strong> Make sure you have admin permissions in your CRM system.
            </p>
            <p>
              <strong>Data Sync:</strong> CRM data is synced automatically every 15 minutes when connected.
            </p>
            <p>
              <strong>Privacy:</strong> We only access the data necessary for call assistance and never modify your CRM records without permission.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
