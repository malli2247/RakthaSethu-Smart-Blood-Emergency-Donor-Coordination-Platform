import React from 'react';
import { UrgencyLevel } from '../types';
import { AlertCircle, AlertTriangle, Clock } from 'lucide-react';

interface UrgencyBadgeProps {
  urgency: UrgencyLevel | string;
}

export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ urgency }) => {
  switch (urgency) {
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white shadow-sm shadow-red-200 animate-pulse">
          <AlertCircle className="w-3.5 h-3.5" />
          CRITICAL EMERGENCY
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          HIGH PRIORITY
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          NORMAL
        </span>
      );
  }
};
