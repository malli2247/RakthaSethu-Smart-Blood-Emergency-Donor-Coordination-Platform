import React from 'react';
import { BloodGroup } from '../types';

interface BloodGroupBadgeProps {
  bloodGroup: BloodGroup | string;
  size?: 'sm' | 'md' | 'lg';
}

const BLOOD_LABELS: Record<string, string> = {
  A_POSITIVE: 'A+',
  A_NEGATIVE: 'A-',
  B_POSITIVE: 'B+',
  B_NEGATIVE: 'B-',
  AB_POSITIVE: 'AB+',
  AB_NEGATIVE: 'AB-',
  O_POSITIVE: 'O+',
  O_NEGATIVE: 'O-',
};

export const BloodGroupBadge: React.FC<BloodGroupBadgeProps> = ({ bloodGroup, size = 'md' }) => {
  const label = BLOOD_LABELS[bloodGroup] || bloodGroup;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold',
    md: 'px-2.5 py-1 text-sm font-bold',
    lg: 'px-4 py-2 text-base font-extrabold shadow-sm',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-rose-100 text-rose-700 border border-rose-200 tracking-wider ${sizeClasses[size]}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse" />
      {label}
    </span>
  );
};
