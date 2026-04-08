import { useI18n } from "@/lib/i18n";
import { ActiveRole } from "@/hooks/useRoleSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, User, GraduationCap, BookOpenCheck, Check } from "lucide-react";

interface Props {
  roles: ActiveRole[];
  activeRole: ActiveRole;
  onSwitch: (role: ActiveRole) => void;
}

const ROLE_CONFIG: Record<ActiveRole, { icon: React.ElementType; colorClass: string; labelKey: string }> = {
  parent: { icon: User, colorClass: "text-primary", labelKey: "role.parent" },
  student: { icon: GraduationCap, colorClass: "text-purple-500", labelKey: "role.student" },
  educator: { icon: BookOpenCheck, colorClass: "text-[#D85A30]", labelKey: "role.educator" },
};

export function RoleSwitcher({ roles, activeRole, onSwitch }: Props) {
  const { t } = useI18n();

  if (roles.length <= 1) return null;

  const ActiveIcon = ROLE_CONFIG[activeRole]?.icon || Users;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="text-primary-foreground/70 hover:text-primary-foreground p-1.5 transition-colors"
          title={t("role.switchRole") || "Switch Role"}
          aria-label={t("role.switchRole") || "Switch Role"}
        >
          <Users size={18} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {roles.map((role) => {
          const config = ROLE_CONFIG[role];
          const Icon = config.icon;
          const isActive = role === activeRole;
          return (
            <DropdownMenuItem
              key={role}
              onClick={() => onSwitch(role)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Icon size={16} className={config.colorClass} />
              <span className="flex-1">{t(config.labelKey) || role}</span>
              {isActive && <Check size={14} className="text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
