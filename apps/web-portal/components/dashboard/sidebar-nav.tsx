"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  LayoutDashboard,
  User,
  CreditCard,
  BookOpen,
  Link as LinkIcon,
  Download,
  LogOut
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

interface SidebarNavProps {
  className?: string
}

const navigation = [
  {
    name: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
  {
    name: "Subscription",
    href: "/dashboard/subscription",
    icon: CreditCard,
  },
  {
    name: "Knowledge Base",
    href: "/dashboard/knowledge",
    icon: BookOpen,
  },
  {
    name: "CRM Connections",
    href: "/dashboard/crm",
    icon: LinkIcon,
  },
  {
    name: "Downloads",
    href: "/dashboard/download",
    icon: Download,
  },
]

export function SidebarNav({ className }: SidebarNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <nav className={cn("flex flex-col space-y-2", className)}>
      {/* Navigation Links */}
      <div className="space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>

      <Separator />

      {/* Logout Button */}
      <Button
        variant="ghost"
        className="justify-start text-muted-foreground hover:text-accent-foreground"
        onClick={handleLogout}
      >
        <LogOut className="mr-3 h-4 w-4" />
        Sign Out
      </Button>
    </nav>
  )
}
