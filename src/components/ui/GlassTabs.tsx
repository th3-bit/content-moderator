import { cn } from "@/lib/utils";
import { ReactNode, useState } from "react";

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface GlassTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

export const GlassTabs = ({ tabs, activeTab, onTabChange, className }: GlassTabsProps) => {
  return (
    <div className={cn("glass-panel p-1.5 inline-flex gap-1", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "relative px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-300 flex items-center gap-2",
            activeTab === tab.id
              ? "bg-primary text-primary-foreground shadow-lg"
              : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
          )}
        >
          {tab.icon}
          {tab.label}
          {activeTab === tab.id && (
            <span className="absolute inset-0 rounded-xl animate-glow pointer-events-none" />
          )}
        </button>
      ))}
    </div>
  );
};
