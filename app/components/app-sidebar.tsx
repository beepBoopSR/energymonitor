"use client"

import * as React from "react"
<<<<<<< HEAD
=======
import { useSearchParams } from "next/navigation"
>>>>>>> 110b56a3422770ab1b69968a2e6a32d399e2cc18
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
<<<<<<< HEAD
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
=======
import { 
  HouseIcon, 
  TerminalIcon, 
  RobotIcon, 
  BookOpenIcon, 
  GearIcon, 
  CropIcon, 
  ChartPieIcon, 
  MapTrifoldIcon 
} from "@phosphor-icons/react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // 1. Haal de live URL parameters op (MOET binnen de functie staan)
  const searchParams = useSearchParams();
  const currentTeam = searchParams.get('team') || "house-1";

  // 2. Het data-object staat nu HIERBINNEN, zodat currentTeam overal werkt!
  const data = {
    user: {
      name: "shadcn",
      email: "m@example.com",
      avatar: "/avatars/shadcn.jpg",
    },
    teams: [
      {
        name: "House 1",
        logo: <HouseIcon />,
        plan: "Network",
      },
      {
        name: "House 2",
        logo: <HouseIcon />,
        plan: "Network",
      },
    ],
    navMain: [
      {
        title: "beepBoopSR",
        url: `/beepBoopSR?team=${currentTeam}#introduction`,
        icon: <TerminalIcon />,
        isActive: true,
        items: [
          {
            title: "Introduction",
            url: `/beepBoopSR?team=${currentTeam}#introduction`,
          },
          {
            title: "Features",
            url: `/beepBoopSR?team=${currentTeam}#features`,
          },
        ],
      },
      {
        title: "E.B.S. N.V.",
        url: `/beepBoopSR?team=${currentTeam}#ebs`, 
        icon: <RobotIcon />,
      },
      {
        title: "Budget",
        url: `/beepBoopSR?team=${currentTeam}#budget`, 
        icon: <BookOpenIcon />,
      },
      {
        title: "Settings",
        url: `/beepBoopSR?team=${currentTeam}#settings`,
        icon: <GearIcon />,
      },
    ],
    platform: [
      {
        name: "Design Engineering",
        url: "#",
        icon: <CropIcon />,
      },
      {
        name: "Sales & Marketing",
        url: "#",
        icon: <ChartPieIcon />,
      },
      {
        name: "Travel",
        url: "#",
        icon: <MapTrifoldIcon />,
>>>>>>> 110b56a3422770ab1b69968a2e6a32d399e2cc18
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