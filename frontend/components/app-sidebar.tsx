'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageCircle, Users, UserCheck } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

/**
 * Navigation items for the application sidebar
 */
const navigationItems = [
  {
    title: 'Conversations',
    url: '/conversations',
    icon: MessageCircle,
  },
  {
    title: 'Users',
    url: '/users',
    icon: Users,
  },
  {
    title: 'Communications Hub',
    url: '/users/communications',
    icon: UserCheck,
  },
] as const

/**
 * Application sidebar component providing navigation between main sections
 * 
 * Features:
 * - Navigation between Conversations and Users pages
 * - Active state highlighting for current page
 * - Consistent with shadcn/ui design system
 * - Mobile responsive via SidebarProvider context
 * - Keyboard navigation support
 */
export function AppSidebar() {
  const pathname = usePathname()

  /**
   * Determines if a navigation item should be marked as active
   * @param url - The URL to check against current pathname
   * @returns true if the item should be active
   */
  const isActive = (url: string) => {
    if (url === '/conversations') {
      return pathname.startsWith('/conversations')
    }
    if (url === '/users') {
      return pathname.startsWith('/users')
    }
    return pathname === url
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Neo4j Communication</span>
            <span className="truncate text-xs text-sidebar-foreground/70">Analytics</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}