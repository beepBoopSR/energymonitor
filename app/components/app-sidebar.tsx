"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { HouseIcon, TerminalIcon, RobotIcon, BookOpenIcon, GearIcon, CropIcon, ChartPieIcon, MapTrifoldIcon } from "@phosphor-icons/react"

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
      url: "/beepBoopSR/about",
      icon: <TerminalIcon />,
      isActive: true,
      items: [
        {
          title: "Introduction",
          url: "#introduction",
        },
        {
          title: "Features",
          url: "#features",
        },
      ],
    },
    {
      title: "E.B.S. N.V.",
      url: "/beepBoopSR/ebs",
      icon: <RobotIcon />,
    },
    {
      title: "Budget", 
      url: "/beepBoopSR/budget",
      icon: <BookOpenIcon />,
    },
    {
      title: "Settings",
      url: "/beepBoopSR/settings",
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
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavProjects projects={data.platform} />
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
