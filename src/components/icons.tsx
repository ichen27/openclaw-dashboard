import {
  Folder,
  Code,
  Server,
  Terminal,
  Bug,
  Zap,
  Shield,
  Database,
  Globe,
  Settings,
  Box,
  Cpu,
  type LucideProps,
} from "lucide-react";

const iconMap: Record<string, React.FC<LucideProps>> = {
  folder: Folder,
  code: Code,
  server: Server,
  terminal: Terminal,
  bug: Bug,
  zap: Zap,
  shield: Shield,
  database: Database,
  globe: Globe,
  settings: Settings,
  box: Box,
  cpu: Cpu,
};

export function CategoryIcon({
  icon,
  ...props
}: { icon: string } & LucideProps) {
  const Icon = iconMap[icon] || Folder;
  return <Icon {...props} />;
}
