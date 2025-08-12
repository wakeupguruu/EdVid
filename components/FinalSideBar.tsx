"use client";

import React from "react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "@/components/ui/sidebar";
import {
  IconPlus,
  IconMessageCircle,
  IconSettings,
  IconUser,
  IconLogout,
  IconVideo,
} from "@tabler/icons-react";

const dummyChats: { label: string; href: string }[] = [
  { label: "Welcome to EdVid", href: "#chat-1" },
  { label: "How to generate a math explainer?", href: "#chat-2" },
  { label: "History: World War II overview", href: "#chat-3" },
  { label: "Physics: Kinematics basics", href: "#chat-4" },
  { label: "Chemistry: Periodic trends", href: "#chat-5" },
];

export default function FinalSideBar() {
  return (
    <div className="peer">
      <Sidebar animate>
        <SidebarBody className="md:relative md:z-20">
          <div className="flex h-full flex-col justify-between">
          <div className="flex flex-col gap-2">
            <SidebarLink
              link={{
                label: "New Video",
                href: "/new",
                icon: <IconPlus className="h-5 w-5" />,
              }}
              className="font-medium"
            />

            <div className="mt-2" />
            <SidebarLink
              link={{
                label: "All Videos",
                href: "/videos",
                icon: <IconVideo className="h-5 w-5" />,
              }}
            />

            <div className="mt-4 h-px w-full bg-neutral-200 dark:bg-neutral-700" />

            <div className="mt-2 flex flex-col">
              {dummyChats.map((chat, index) => (
                <SidebarLink
                  key={`chat-${index}`}
                  link={{
                    label: chat.label,
                    href: chat.href,
                    icon: <IconMessageCircle className="h-5 w-5" />,
                  }}
                  className="truncate"
                />
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2">
            <div className="h-px w-full bg-neutral-200 dark:bg-neutral-700" />
            <SidebarLink
              link={{
                label: "Profile",
                href: "/profile",
                icon: <IconUser className="h-5 w-5" />,
              }}
            />
            <SidebarLink
              link={{
                label: "Settings",
                href: "/settings",
                icon: <IconSettings className="h-5 w-5" />,
              }}
            />
            <SidebarLink
              link={{
                label: "Logout",
                href: "/api/auth/signout",
                icon: <IconLogout className="h-5 w-5" />,
              }}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            />
          </div>
          </div>
        </SidebarBody>
      </Sidebar>
    </div>
  );
}


