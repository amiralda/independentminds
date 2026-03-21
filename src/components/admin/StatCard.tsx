import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: string;
  sub?: string;
}

export default function StatCard({ label, value, icon: Icon, color = "text-blue-400", sub }: StatCardProps) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-3 sm:p-5">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-white/50 text-[10px] sm:text-xs font-medium uppercase tracking-wider">{label}</span>
        <Icon size={16} className={`${color} sm:w-[18px] sm:h-[18px]`} />
      </div>
      <p className="text-xl sm:text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-[10px] sm:text-xs text-white/40 mt-1">{sub}</p>}
    </div>
  );
}
