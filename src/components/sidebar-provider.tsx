"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

const STORAGE_KEY = "sidebar-open";
const MOBILE_BREAKPOINT = 768;

interface SidebarContextValue {
  isOpen: boolean;
  isMobile: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

interface SidebarProviderProps {
  children: ReactNode;
}

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Initialize state from localStorage and screen size
  useEffect(() => {
    const checkMobile = () => window.innerWidth < MOBILE_BREAKPOINT;
    const mobile = checkMobile();
    setIsMobile(mobile);

    // On mobile, default to closed. On desktop, restore from localStorage
    if (mobile) {
      setIsOpen(false);
    } else {
      const stored = localStorage.getItem(STORAGE_KEY);
      setIsOpen(stored !== "false");
    }

    setMounted(true);

    // Listen for resize
    const handleResize = () => {
      const nowMobile = checkMobile();
      setIsMobile(nowMobile);
      // Auto-close when switching to mobile
      if (nowMobile && !checkMobile()) {
        setIsOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Persist to localStorage (desktop only)
  useEffect(() => {
    if (mounted && !isMobile) {
      localStorage.setItem(STORAGE_KEY, String(isOpen));
    }
  }, [isOpen, isMobile, mounted]);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);
  const open = useCallback(() => setIsOpen(true), []);

  return (
    <SidebarContext.Provider value={{ isOpen, isMobile, toggle, close, open }}>
      {children}
    </SidebarContext.Provider>
  );
}
