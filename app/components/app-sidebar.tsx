"use client"
//sidebar
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
import { HouseIcon, RowsIcon, WaveformIcon, CommandIcon, TerminalIcon, RobotIcon, BookOpenIcon, GearIcon, CropIcon, ChartPieIcon, MapTrifoldIcon } from "@phosphor-icons/react"

// This is sample data.
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [
    {
      name: "House 1",
      logo: (
        <HouseIcon
        />
      ),
      plan: "Network",
    },
    {
      name: "House 2",
      logo: (
        <HouseIcon
        />
      ),
      plan: "Network",
    },
  ],
  navMain: [
    {
      title: "beepBoopSR",
      url: "/beepBoopSR/about",
      icon: (
        <TerminalIcon
        />
      ),
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
      url: "#",
      icon: (
        <RobotIcon
        />
      ),
      items: [
        {
          title: "Inloggen",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Budget",
      url: "#",
      icon: (
        <BookOpenIcon
        />
      )
    },
    {
      title: "Settings",
      url: "#",
      icon: (
        <GearIcon
        />
      ),
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Account",
          url: "#",
        },
        {
          title: "EBS login",
          url: "#",
        },
        {
          title: "Budget",
          url: "#",
        },
        {
          title: "AI chatbox",
          url: "#",
        }
      ],
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: (
        <CropIcon
        />
      ),
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: (
        <ChartPieIcon
        />
      ),
    },
    {
      name: "Travel",
      url: "#",
      icon: (
        <MapTrifoldIcon
        />
      ),
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
        <NavProjects projects={data.projects} />
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
