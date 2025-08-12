"use client";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";

import { useEffect, useState } from "react";
import { IconMoon, IconSun, IconBrandGithub, IconBrandLinkedin, IconBrandInstagram, IconChevronDown } from "@tabler/icons-react";

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Check if theme is stored in localStorage
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setIsDark(storedTheme === "dark");
      if (storedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } else {
      // Check system preference
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(systemPrefersDark);
      if (systemPrefersDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        aria-label="Toggle theme"
        className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
      >
        <IconMoon size={18} />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="rounded-md p-2 text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 transition-colors"
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}

function ContactDropdown() {
  const [isOpen, setIsOpen] = useState(false);

  const socialLinks = [
    {
      name: "GitHub",
      url: "https://github.com/wakeupguruu",
      icon: <IconBrandGithub size={18} />,
      color: "hover:text-gray-700 dark:hover:text-gray-300"
    },
    {
      name: "LinkedIn",
      url: "https://linkedin.com/in/your-profile",
      icon: <IconBrandLinkedin size={18} />,
      color: "hover:text-blue-600 dark:hover:text-blue-400"
    },
    {
      name: "Instagram",
      url: "https://instagram.com/your-profile",
      icon: <IconBrandInstagram size={18} />,
      color: "hover:text-pink-600 dark:hover:text-pink-400"
    }
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-4 py-2 text-white hover:text-gray-200 transition-colors"
      >
        Contact
        <IconChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-neutral-800 rounded-lg shadow-lg border border-neutral-200 dark:border-neutral-700 py-2 z-50">
          {socialLinks.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 ${link.color} transition-colors`}
              onClick={() => setIsOpen(false)}
            >
              {link.icon}
              {link.name}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function AppBar() {
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/wakeupguruu/EdVid";
  const navItems = [
    {
      name: "Features",
      link: "#features",
    },
    {
      name: "GitHub",
      link: githubUrl,
      icon: <IconBrandGithub size={18} />
    },
    {
      name: "Pricing",
      link: "#pricing",
    },
    {
      name: "Contact",
      link: "#contact",
      isDropdown: true
    },
  ];

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div>
      <div className="relative w-full">
        <Navbar>
          {/* Desktop Navigation */}
          <NavBody>
            <div className="flex items-center gap-1">
              <NavbarLogo />
            </div>
            <NavItems items={navItems} ContactDropdownComponent={ContactDropdown} />
            <div className="flex items-center gap-4">
              <ThemeToggle />
            </div>
          </NavBody>

          {/* Mobile Navigation */}
          <MobileNav>
            <MobileNavHeader>
              <div className="flex items-center gap-1">
                <NavbarLogo />
              </div>
              <MobileNavToggle
                isOpen={isMobileMenuOpen}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              />
            </MobileNavHeader>

            <MobileNavMenu
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
            >
              {navItems.map((item, idx) => (
                <div key={`mobile-link-${idx}`}>
                  {item.isDropdown ? (
                    <div className="px-4 py-2">
                      <div className="text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">Contact</div>
                      <div className="space-y-2">
                        <a
                          href="https://github.com/wakeupguruu"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300 hover:text-gray-700 dark:hover:text-gray-300"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <IconBrandGithub size={18} />
                          GitHub
                        </a>
                        <a
                          href="https://linkedin.com/in/your-profile"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <IconBrandLinkedin size={18} />
                          LinkedIn
                        </a>
                        <a
                          href="https://instagram.com/your-profile"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 text-sm text-neutral-700 dark:text-neutral-300 hover:text-pink-600 dark:hover:text-pink-400"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <IconBrandInstagram size={18} />
                          Instagram
                        </a>
                      </div>
                    </div>
                  ) : (
                    <a
                      href={item.link}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="relative text-neutral-600 dark:text-neutral-300 block px-4 py-2"
                    >
                      <span className="block">{item.name}</span>
                    </a>
                  )}
                </div>
              ))}

              <div className="flex w-full flex-col gap-4">
                <ThemeToggle />
              </div>
            </MobileNavMenu>
          </MobileNav>
        </Navbar>
      </div>
    </div>
  );
}

