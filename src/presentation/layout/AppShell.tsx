import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import {
  BarChart3,
  CalendarDays,
  Clock3,
  House,
  LayoutList,
  Plus,
  Settings,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { AnimatedPlant } from "../components/AnimatedPlant";

export type AppSection = "today" | "habits" | "week" | "calendar" | "analytics" | "settings";

const navigation: ReadonlyArray<{
  id: AppSection;
  label: string;
  icon: typeof CalendarDays;
}> = [
  { id: "today", label: "Today", icon: House },
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
  readonly onAddHabit: () => void;
  readonly children: ReactNode;
}

export function AppShell({
  activeSection,
  onNavigate,
  onAddHabit,
  children,
}: AppShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState(getSavedSidebarWidth);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("habit-tracker-sidebar-collapsed") === "true",
  );
  const resizing = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const [mobileKeyboardOpen, setMobileKeyboardOpen] = useState(false);
  const effectiveSidebarWidth = sidebarCollapsed ? COLLAPSED_SIDEBAR_WIDTH : sidebarWidth;

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboardState = () => {
      setMobileKeyboardOpen(window.innerHeight - viewport.height > 140);
    };
    updateKeyboardState();
    viewport.addEventListener("resize", updateKeyboardState);
    return () => viewport.removeEventListener("resize", updateKeyboardState);
  }, []);

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
  const navigate = (section: AppSection) => {
    onNavigate(section);
    window.requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }));
  };
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
      <a
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-ink-950 px-4 py-2 text-sm font-semibold text-surface shadow-lg transition-transform focus:translate-y-0"
        href="#main-content"
      >
        Skip to main content
      </a>
      <aside className="app-sidebar hidden bg-canvas transition-[width] duration-200 ease-out lg:fixed lg:inset-y-0 lg:block lg:border-r lg:border-line lg:bg-surface">
        <div className={cn(
          "flex items-center justify-between px-5 lg:h-20",
          sidebarCollapsed && "lg:justify-center lg:px-2",
        )}>
          <div className={cn("flex min-w-0 items-end gap-3", sidebarCollapsed && "lg:justify-center")}>
            <button
              className="hidden size-11 shrink-0 place-items-center transition-transform duration-150 ease-out hover:scale-[1.04] active:scale-95 lg:grid"
              onClick={toggleSidebar}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <AnimatedPlant plantType="oak" stage={4} size={44} />
            </button>
          </div>
        </div>

        <nav
          className={cn(
            "hidden lg:block lg:space-y-1 lg:py-4",
            sidebarCollapsed ? "lg:px-2" : "lg:px-3",
          )}
          aria-label="Primary navigation"
        >
          {navigation.map((item, index) => {
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
                onClick={() => navigate(item.id)}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                aria-keyshortcuts={`Alt+${index + 1}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={18} strokeWidth={isActive ? 2.3 : 1.8} aria-hidden="true" />
                <span className={cn(sidebarCollapsed && "lg:hidden")}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {!sidebarCollapsed && (
          <p className="absolute bottom-0 hidden w-full border-t border-line px-6 py-4 text-[11px] text-ink-400 lg:block">
            Private · Local · Offline
          </p>
        )}

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

      <nav
        className={cn(
          "mobile-bottom-nav fixed inset-x-3 z-50 mx-auto max-w-md items-center justify-between gap-0.5 rounded-[1.65rem] border border-line bg-surface/95 px-2 py-2 shadow-[0_12px_36px_rgba(20,20,18,0.22)] backdrop-blur-xl lg:hidden",
          mobileKeyboardOpen ? "hidden" : "flex",
        )}
        aria-label="Primary navigation"
      >
        {activeSection === "today" ? (
          <button
            className="grid size-12 shrink-0 place-items-center rounded-full bg-leaf-600 text-white shadow-md transition-transform duration-150 active:scale-90"
            type="button"
            onClick={onAddHabit}
            aria-label="Add habit"
            title="Add habit"
          >
            <Plus size={23} strokeWidth={2.5} aria-hidden="true" />
          </button>
        ) : (
          <button
            className="grid size-12 shrink-0 place-items-center rounded-full transition-transform duration-150 active:scale-90"
            type="button"
            onClick={() => navigate("today")}
            aria-label="Go to Today"
            title="Today"
          >
            <AnimatedPlant plantType="oak" stage={4} size={39} />
          </button>
        )}
        {navigation.filter((item) => item.id !== "today").map((item, index) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const navigationButton = (
            <button
              key={item.id}
              className={cn(
                "grid size-11 shrink-0 place-items-center rounded-full text-ink-600 transition-[color,background-color,transform] duration-150 active:scale-90",
                isActive && "bg-ink-950 text-surface",
              )}
              type="button"
              onClick={() => navigate(item.id)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              aria-keyshortcuts={`Alt+${index + 1}`}
              title={item.label}
            >
              <Icon size={20} strokeWidth={isActive ? 2.4 : 1.9} aria-hidden="true" />
            </button>
          );

          return navigationButton;
        })}
      </nav>

      <main
        ref={mainRef}
        id="main-content"
        className="min-w-0 pb-[calc(6.5rem+env(safe-area-inset-bottom))] outline-none lg:col-start-2 lg:pb-0"
        tabIndex={-1}
        aria-label={`${navigation.find((item) => item.id === activeSection)?.label ?? "Habitree"} page`}
      >
        {children}
      </main>
    </div>
  );
}
