"use client"

import * as React from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { CaretUpDownIcon, PlusIcon, HouseIcon, TrashIcon, ListIcon} from "@phosphor-icons/react"

import {useRouter} from "next/navigation"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: React.ReactNode
    plan: string
  }[]
}) {
  const { isMobile, toggleSidebar, activeTeam, setActiveTeam } = useSidebar()
  const router = useRouter()
  const [networks, setNetworks] = React.useState(teams)

  React.useEffect(() => {
    if (!activeTeam && teams.length > 0) {
      setActiveTeam(teams[0])
    }
  }, [teams, activeTeam, setActiveTeam])

  React.useEffect(() => {
    if (activeTeam) {
      if (window.location.pathname.endsWith('/about')) {
        return; 
      }
      const teamSlug = activeTeam.name.toLowerCase().replace(/\s+/g, '-');
      router.push(`/beepBoopSR?team=${teamSlug}`)
    }
  }, [activeTeam, router]);

  const handleAddNetwork = () => {
    const name = window.prompt("Enter new network name:")
    if (name?.trim()) {
      const newNetwork = {
        name: name.trim(),
        logo: <HouseIcon />,
        plan: "Network",
      }
      const updated = [...networks, newNetwork]
      setNetworks(updated)
      setActiveTeam(newNetwork)
    }
  }

  const currentLogo = activeTeam ? activeTeam.logo : <HouseIcon />
  const currentName = activeTeam ? activeTeam.name : "Select Network"
  const currentPlan = activeTeam ? activeTeam.plan : "No active network"

  return (
    <SidebarMenu>
      <div className="flex w-full items-center justify-start group-data- [collapsible=icon]:justify-center px-2 pb-1.5">
        <button 
          onClick={ (e) => {
            e.preventDefault()
            toggleSidebar()
          }}
          className="flex size-8 items-center justify-center rounded-md hover:bg-sidebar-accent text-sidebar-forground cursor-pointer transition-colors"
          aria-label="Toggle Sidebar"
          >
            <ListIcon className="size-5" />
          
          </button>
      </div>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
            <div 
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
                const teamSlug = activeTeam ? activeTeam.name.toLowerCase().replace(/\s+/g, '-') : '';
                router.push(teamSlug ? `/beepBoopSR?team=${teamSlug}` : "/beepBoopSR")
              }}
              onPointerDown={(e) => {
                e.stopPropagation()
                e.preventDefault() 
              }}
              onMouseDown={(e) => {
                e.stopPropagation()
                e.preventDefault() 
              }}
              className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground cursor-pointer hover:opacity-80 transition-opacity"
            >
              {currentLogo}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{currentName}</span>
              <span className="truncate text-xs">{currentPlan}</span>
            </div>
              <CaretUpDownIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              Netwerken
            </DropdownMenuLabel>
            {networks.map((team) => (
              <DropdownMenuItem
                key={team.name}
                onClick={() => setActiveTeam(team)}
                className="flex items-center justify-between gap-2 p-2 cursor-pointer w-full"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex size-6 shrink-0 items-center justify-center rounded-md border">
                    {team.logo}
                  </div>
                  <span className="truncate">{team.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    const confirmDelete = window.confirm(`Are you sure you want to remove "${team.name}"?`)
                    if (confirmDelete) {
                      const updated = networks.filter((n) => n.name !== team.name)
                      setNetworks(updated)
                      if (activeTeam?.name === team.name) {
                        setActiveTeam(updated[0] || null)
                      }
                    }
                  }}
                  className="p-1 hover:bg-sidebar-accent rounded text-destructive flex items-center justify-center size-6 shrink-0"
                  title="Remove Network"
                >
                  <TrashIcon className="size-4" />
                </button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleAddNetwork}
              className="gap-2 p-2 cursor-pointer"
            >
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <PlusIcon className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">Add network</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
