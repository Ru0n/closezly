"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Download, Monitor, Smartphone, CheckCircle, ExternalLink, Apple, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function DownloadPage() {
  const [userOS, setUserOS] = useState<string>("")
  const [downloadStarted, setDownloadStarted] = useState<string | null>(null)

  useEffect(() => {
    // Detect user's operating system
    const platform = navigator.platform.toLowerCase()
    if (platform.includes('mac')) {
      setUserOS('macOS')
    } else if (platform.includes('win')) {
      setUserOS('Windows')
    } else if (platform.includes('linux')) {
      setUserOS('Linux')
    } else {
      setUserOS('Unknown')
    }
  }, [])

  const handleDownload = (platform: string) => {
    setDownloadStarted(platform)

    // In a real app, this would trigger the actual download
    console.log(`Starting download for ${platform}`)

    // Simulate download
    setTimeout(() => {
      setDownloadStarted(null)
      alert(`Download for ${platform} would start here. In a real app, this would download the installer.`)
    }, 2000)
  }

  const downloads = [
    {
      id: 'macos',
      name: 'macOS',
      icon: <Apple className="h-8 w-8" />,
      description: 'For Mac computers running macOS 10.15 or later',
      version: 'v1.2.0',
      size: '85 MB',
      requirements: ['macOS 10.15+', 'Intel or Apple Silicon', '200 MB free space'],
      recommended: userOS === 'macOS'
    },
    {
      id: 'windows',
      name: 'Windows',
      icon: <Monitor className="h-8 w-8" />,
      description: 'For Windows computers running Windows 10 or later',
      version: 'v1.2.0',
      size: '92 MB',
      requirements: ['Windows 10+', 'x64 processor', '250 MB free space'],
      recommended: userOS === 'Windows'
    }
  ]

  const features = [
    {
      icon: <Zap className="h-5 w-5 text-blue-500" />,
      title: "Real-time AI Assistance",
      description: "Get instant AI-powered suggestions during your sales calls"
    },
    {
      icon: <Monitor className="h-5 w-5 text-green-500" />,
      title: "Screen Overlay",
      description: "Transparent overlay that works with any video conferencing tool"
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-purple-500" />,
      title: "Call Recording",
      description: "Optional call recording with automatic transcription"
    },
    {
      icon: <ExternalLink className="h-5 w-5 text-orange-500" />,
      title: "CRM Integration",
      description: "Seamless integration with your existing CRM systems"
    }
  ]

  return (
    <div className="p-6 max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Download Desktop App
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Get the Closezly desktop application for real-time AI assistance during your sales calls
        </p>
      </div>

      <div className="space-y-8">
        {/* App Features */}
        <Card>
          <CardHeader>
            <CardTitle>Why Use the Desktop App?</CardTitle>
            <CardDescription>
              The desktop app provides seamless integration with your workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start space-x-3"
                >
                  <div className="flex-shrink-0 mt-1">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Download Options */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Choose Your Platform</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {downloads.map((download) => (
              <motion.div
                key={download.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative ${download.recommended ? 'ring-2 ring-primary' : ''}`}
              >
                {download.recommended && (
                  <Badge className="absolute -top-2 left-4 z-10">
                    Recommended for you
                  </Badge>
                )}

                <Card className="h-full">
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      {download.icon}
                    </div>
                    <CardTitle>{download.name}</CardTitle>
                    <CardDescription>{download.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Version:</span>
                      <span className="font-medium">{download.version}</span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-300">Size:</span>
                      <span className="font-medium">{download.size}</span>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">System Requirements:</h4>
                      <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
                        {download.requirements.map((req, index) => (
                          <li key={index} className="flex items-center space-x-2">
                            <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleDownload(download.id)}
                      disabled={downloadStarted === download.id}
                    >
                      {downloadStarted === download.id ? (
                        <>
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Preparing Download...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Download for {download.name}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Installation Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Installation Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-medium mb-3">macOS Installation:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>Download the .dmg file</li>
                <li>Open the downloaded file</li>
                <li>Drag Closezly to your Applications folder</li>
                <li>Launch Closezly from Applications</li>
                <li>Grant necessary permissions when prompted</li>
              </ol>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-3">Windows Installation:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li>Download the .exe installer</li>
                <li>Run the installer as administrator</li>
                <li>Follow the installation wizard</li>
                <li>Launch Closezly from the Start menu</li>
                <li>Allow firewall access when prompted</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <p>
                <strong>Having trouble installing?</strong> Check our installation guide or contact support.
              </p>
              <p>
                <strong>System compatibility:</strong> The app requires modern hardware and operating systems for optimal performance.
              </p>
              <p>
                <strong>Updates:</strong> The app will automatically check for updates and notify you when new versions are available.
              </p>
            </div>
            <div className="mt-4">
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Installation Guide
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
