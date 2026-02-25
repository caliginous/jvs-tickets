import { Tab } from '@headlessui/react';
import { cn } from './cn';

interface TabsProps {
  tabs: Array<{ id: string; label: string }>;
  children: React.ReactNode;
  defaultIndex?: number;
  className?: string;
}

export function Tabs({ tabs, children, defaultIndex = 0, className }: TabsProps) {
  return (
    <Tab.Group defaultIndex={defaultIndex}>
      <Tab.List className={cn("flex space-x-1 rounded-xl bg-gray-100 p-1", className)}>
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            className={({ selected }) =>
              cn(
                "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                selected
                  ? "bg-white text-blue-700 shadow"
                  : "text-gray-600 hover:bg-white/[0.12] hover:text-gray-800"
              )
            }
          >
            {tab.label}
          </Tab>
        ))}
      </Tab.List>
      <Tab.Panels className="mt-4">
        {tabs.map((tab) => (
          <Tab.Panel
            key={tab.id}
            className={cn(
              "rounded-xl bg-white p-3",
              "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2"
            )}
          >
            {children}
          </Tab.Panel>
        ))}
      </Tab.Panels>
    </Tab.Group>
  );
}
