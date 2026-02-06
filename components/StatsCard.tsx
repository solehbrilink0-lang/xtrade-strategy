import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, subValue, icon: Icon, trend, color = "blue" }) => {
  const getColorClasses = () => {
    switch(color) {
      case 'orange': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'yellow': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'green': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'red': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <div className={`p-4 rounded-xl border ${getColorClasses()} transition-all hover:scale-[1.01] bg-opacity-10 backdrop-blur-sm`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
          {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-white/5`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};