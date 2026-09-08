import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  Clock3,
  LayoutList,
  Moon,
  Settings,
  Sun,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { AnimatedPlant } from "../components/AnimatedPlant";
import { Button } from "../components/ui/Button";

export type AppSection = "today" | "habits" | "week" | "calendar" | "analytics" | "settings";

const navigation: ReadonlyArray<{
  id: AppSection;
  label: string;
  icon: typeof CalendarDays;
}> = [
  { id: "today", label: "Today", icon: Check },
  { id: "habits", label: "Habits", icon: LayoutList },
  { id: "week", label: "Week", icon: Clock3 },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];

const MIN_SIDEBAR_WIDTH = 200;
const MAX_SIDEBAR_WIDTH = 360;
const DEFAULT_SIDEBAR_WIDTH = 232;
const COLLAPSED_SIDEBAR_WIDTH = 76;

function getSavedSidebarWidth() {
  const savedValue = localStorage.getItem("habit-tracker-sidebar-width");
  if (savedValue === null) return DEFAULT_SIDEBAR_WIDTH;
  const saved = Number(savedValue);
  return Number.isFinite(saved)
    ? Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, saved))
    : DEFAULT_SIDEBAR_WIDTH;
}

interface AppShellProps {
  readonly activeSection: AppSection;
  readonly onNavigate: (section: AppSection) => void;
  readonly theme: "light" | "dark";
  readonly onToggleTheme: () => void;
  readonly children: ReactNode;
}

export function AppShell({
  activeSection,
  onNavigate,
  theme,
  onToggleTheme,
  children,
}: AppShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState(getSavedSidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("habit-tracker-sidebar-collapsed") === "true",
  );
  const resizing = useRef(false);
  const effectiveSidebarWidth = sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth;

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!resizing.current) return;
      setSidebarWidth(Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, event.clientX)));
    };
    const stopResizing = () => {
      if (!resizing.current) return;
      resizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopResizing);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopResizing);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("habit-tracker-sidebar-width", String(sidebarWidth));
  }, [sidebarWidth]);

  useEffect(() => {
    localStorage.setItem("habit-tracker-sidebar-collapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => setSidebarCollapsed((current) => !current);
  const adjustSidebarWidth = (amount: number) => {
    setSidebarCollapsed(false);
    setSidebarWidth((current) => Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, current + amount)));
  };
  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      adjustSidebarWidth(-16);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      adjustSidebarWidth(16);
    }
    if (event.key === "Home") {
      event.preventDefault();
      setSidebarWidth(MIN_SIDEBAR_WIDTH);
    }
    if (event.key === "End") {
      event.preventDefault();
      setSidebarWidth(MAX_SIDEBAR_WIDTH);
    }
  };

  return (
    <div
      className="app-shell min-h-screen bg-canvas text-ink-950 lg:grid"
      style={{ "--sidebar-width": `${effectiveSidebarWidth}px` } as CSSProperties}
    >
      <aside className="app-sidebar border-line bg-surface transition-[width] duration-200 ease-out lg:fixed lg:inset-y-0 lg:border-r">
        <div className={cn(
          "flex h-16 items-center justify-between border-b border-line px-5 lg:h-20 lg:border-b-0",
          sidebarCollapsed && "lg:justify-center lg:px-2",
        )}>
          <div className={cn("flex min-w-0 items-end gap-3", sidebarCollapsed && "lg:justify-center")}>
            <button
              className="grid size-11 shrink-0 place-items-center transition-transform duration-150 ease-out hover:scale-[1.04] active:scale-95"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <AnimatedPlant plantType="oak" stage={4} size={44} />
            </button>
            <button
              className={cn("flex min-w-0 items-end rounded-lg pb-1 text-left", sidebarCollapsed && "lg:hidden")}
              onClick={() => onNavigate("today")}
              aria-label="Go to Today"
            >
              <span className="block text-xl font-bold leading-none tracking-[-0.03em]">Habitree</span>
            </button>
          </div>
          <Button
            className="lg:hidden"
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </Button>
        </div>

        <nav
          className={cn(
            "flex gap-1 overflow-x-auto px-3 py-2 lg:block lg:space-y-1 lg:py-4",
            sidebarCollapsed ? "lg:px-2" : "lg:px-3",
          )}
          aria-label="Primary navigation"
        >
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                className={cn(
                  "group flex min-w-max items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 lg:w-full",
                  sidebarCollapsed && "lg:justify-center lg:px-0",
                  isActive
                    ? "bg-ink-950 text-surface"
                    : "text-ink-600 hover:bg-leaf-50 hover:text-ink-950",
                )}
                onClick={() => onNavigate(item.id)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} aria-hidden="true" />
                <span className={cn(sidebarCollapsed && "lg:hidden")}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={cn(
          "absolute bottom-0 hidden w-full border-t border-line p-3 lg:block",
          sidebarCollapsed && "lg:px-2",
        )}>
          <Button
            className={cn("w-full", sidebarCollapsed ? "justify-center px-0" : "justify-start")}
            variant="ghost"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            title={sidebarCollapsed ? `${theme === "light" ? "Dark" : "Light"} mode` : undefined}
          >
            {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            <span className={cn(sidebarCollapsed && "hidden")}>{theme === "light" ? "Dark mode" : "Light mode"}</span>
          </Button>
          {!sidebarCollapsed && <p className="px-3 pt-2 text-[11px] text-ink-400">Private · Local · Offline</p>}
        </div>

        {!sidebarCollapsed && (
          <div
            className="group absolute inset-y-0 -right-1.5 z-30 hidden w-3 cursor-col-resize touch-none lg:block"
            role="separator"
            aria-label="Resize sidebar"
            aria-orientation="vertical"
            aria-valuemin={MIN_SIDEBAR_WIDTH}
            aria-valuemax={MAX_SIDEBAR_WIDTH}
            aria-valuenow={sidebarWidth}
            tabIndex={0}
            title="Drag to resize sidebar"
            onPointerDown={(event) => {
              event.preventDefault();
              resizing.current = true;
              document.body.style.cursor = "col-resize";
              document.body.style.userSelect = "none";
            }}
            onKeyDown={handleResizeKeyDown}
            onDoubleClick={() => setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)}
          >
            <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-ink-400 group-focus:bg-ink-400" />
          </div>
        )}
      </aside>

      <main className="min-w-0 lg:col-start-2">{children}</main>
    </div>
  );
}
