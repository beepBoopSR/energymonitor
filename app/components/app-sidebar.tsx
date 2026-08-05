"use client"

import * as React from "react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  GaugeIcon,
  LightningIcon,
  GearIcon,
  InfoIcon,
  ListIcon,
} from "@phosphor-icons/react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const { toggleSidebar } = useSidebar()

  const data = {
    user: {
      name: "energyLink",
      email: "beepboop_001",
      avatar: "",
    },
    navMain: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: <GaugeIcon />,
        isActive: true,
      },
      {
        title: "Uitval",
        url: "/uitval",
        icon: <LightningIcon />,
      },
      {
        title: "Instellingen",
        url: "/instellingen",
        icon: <GearIcon />,
      },
      {
        title: "Over",
        url: "/over",
        icon: <InfoIcon />,
      },
    ],
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* toggle button — three lines, collapses/expands the sidebar */}
        <div className="flex items-center gap-2 px-1 py-1">
          <button
            onClick={toggleSidebar}
            aria-label="Menu in-/uitklappen"
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent cursor-pointer"
          >
            <ListIcon className="size-5" />
          </button>
          {/* brand — hides when collapsed */}
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-mono text-[11px] text-muted-foreground">
              beep<span className="text-[color:var(--ok)]">Boop</span>
            </span>
            <span className="text-base font-extrabold tracking-tight text-[color:var(--primary)]">
              energyLink
            </span>
          </div>
        </div>
      </SidebarHeader>
 
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
 
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
 
      <SidebarRail />
    </Sidebar>
  )
}