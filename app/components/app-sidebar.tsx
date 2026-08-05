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
} from "@/components/ui/sidebar"
import {
  GaugeIcon,
  LightningIcon,
  GearIcon,
  InfoIcon,
} from "@phosphor-icons/react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // energyLink is one device per household — no team/house switching.
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
        {/* energyLink brand lockup */}
        <div className="flex flex-col px-2 py-1.5 group-data-[collapsible=icon]:hidden">
          <span className="text-xs font-mono text-muted-foreground leading-none">
            beep<span className="text-[color:var(--ok)]">Boop</span>
          </span>
          <span className="text-lg font-extrabold leading-tight tracking-tight text-[color:var(--primary)]">
            energyLink
          </span>
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