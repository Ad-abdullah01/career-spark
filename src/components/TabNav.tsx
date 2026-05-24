import { cn } from "@/lib/utils";
import { BriefcaseBusiness, MessageSquareText, Route } from "lucide-react";

interface TabNavProps {
  activeTab: number;
  onTabChange: (tab: number) => void;
}

const tabs = [
  { icon: MessageSquareText, label: "Assessment" },
  { icon: BriefcaseBusiness, label: "Matches" },
  { icon: Route, label: "Pathway" },
];

const TabNav = ({ activeTab, onTabChange }: TabNavProps) => {
  return (
    <nav className="fixed left-1/2 top-4 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2">
      <div className="flex items-center justify-center gap-1 rounded-lg border border-border bg-card/90 p-1 shadow-sm backdrop-blur-xl">
        {tabs.map((tab, i) => {
          const Icon = tab.icon;
          return (
          <button
            key={i}
            onClick={() => onTabChange(i)}
            className={cn(
              "flex min-w-0 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              activeTab === i
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
          );
        })}
      </div>
    </nav>
  );
};

export default TabNav;
