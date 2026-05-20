"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabContextValue {
  value: string;
  onChange: (value: string) => void;
}

const TabContext = React.createContext<TabContextValue | null>(null);

function useTabContext() {
  const ctx = React.useContext(TabContext);
  if (!ctx) throw new Error("Tab subcomponents must be used inside Tab.Root");
  return ctx;
}

export interface TabRootProps {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

function TabRoot({ value, onChange, children, className }: TabRootProps) {
  return (
    <TabContext.Provider value={{ value, onChange }}>
      <div className={className}>{children}</div>
    </TabContext.Provider>
  );
}
TabRoot.displayName = "Tab.Root";

export interface TabListProps {
  children: React.ReactNode;
  className?: string;
  bordered?: boolean;
}

function TabList({ children, className, bordered = true }: TabListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex",
        bordered && "border-b border-toss-divider",
        className
      )}
    >
      {children}
    </div>
  );
}
TabList.displayName = "Tab.List";

export interface TabTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

function TabTrigger({ value, children, className, disabled }: TabTriggerProps) {
  const ctx = useTabContext();
  const selected = ctx.value === value;

  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      disabled={disabled}
      onClick={() => !disabled && ctx.onChange(value)}
      className={cn(
        "relative h-10 px-2 text-toss-body font-medium transition-colors select-none",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        selected
          ? "text-toss-text-primary"
          : "text-toss-text-tertiary hover:text-toss-text-secondary",
        className
      )}
    >
      {children}
      {selected && (
        <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-toss-text-primary" />
      )}
    </button>
  );
}
TabTrigger.displayName = "Tab.Trigger";

export interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
  keepMounted?: boolean;
}

function TabPanel({ value, children, className, keepMounted = false }: TabPanelProps) {
  const ctx = useTabContext();
  const selected = ctx.value === value;

  if (!selected && !keepMounted) return null;

  return (
    <div
      role="tabpanel"
      hidden={!selected}
      className={cn(className)}
    >
      {children}
    </div>
  );
}
TabPanel.displayName = "Tab.Panel";

export const Tab = {
  Root: TabRoot,
  List: TabList,
  Trigger: TabTrigger,
  Panel: TabPanel,
};
