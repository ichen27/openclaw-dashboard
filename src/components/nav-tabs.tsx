'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ListTodo, Bot, BarChart3, Brain, Sun, Briefcase, Code2, StickyNote, CalendarDays, MessageCircle, Monitor, BookOpen } from 'lucide-react';

const tabs = [
  { href: '/today', label: 'Today', icon: Sun },
  { href: '/', label: 'Tasks', icon: ListTodo },
  { href: '/apply', label: 'Apply', icon: Briefcase },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/lc', label: 'LC', icon: Code2 },
  { href: '/journal', label: 'Journal', icon: BookOpen },
  { href: '/notes', label: 'Notes', icon: StickyNote },
  { href: '/feed', label: 'Feed', icon: MessageCircle },
  { href: '/chat', label: 'Chat', icon: Monitor },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/knowledge', label: 'Knowledge', icon: Brain },
];

export function NavTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-0.5 sm:gap-1 overflow-x-auto scrollbar-none">
      {tabs.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="hidden md:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
