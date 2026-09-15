import React from 'react';
import { AnimatedCounter } from './common/AnimatedCounter';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: string; positive: boolean };
  color?: 'red' | 'emerald' | 'blue' | 'purple' | 'amber';
  suffix?: string;
  prefix?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'red',
  suffix = '',
  prefix = '',
}) => {
  const colorMap = {
    red: 'bg-rose-50 text-rose-600 border-rose-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  const isNumeric = typeof value === 'number';

  return (
    <div className="group bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs sm:text-sm font-semibold text-slate-500">{title}</span>
        <div className={`p-2.5 rounded-xl border transition-transform duration-200 group-hover:scale-105 ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          {isNumeric ? (
            <AnimatedCounter value={value as number} prefix={prefix} suffix={suffix} />
          ) : (
            <span>{value}</span>
          )}
        </div>
        {trend && (
          <span
            className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
              trend.positive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {trend.positive ? '+' : ''}
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-slate-400 mt-1.5 font-medium">{subtitle}</p>}
    </div>
  );
};
