import React from 'react';
import { RequestStatus } from '../types';
import { CheckCircle2, Clock, Activity, UserCheck, XCircle, AlertOctagon } from 'lucide-react';

interface StatusBadgeProps {
  status: RequestStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'FULFILLED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Fulfilled
        </span>
      );
    case 'DONATION_CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 border border-teal-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          Donation Confirmed
        </span>
      );
    case 'DONOR_ACCEPTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          Donor Accepted
        </span>
      );
    case 'MATCHING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300 animate-pulse">
          <Activity className="w-3.5 h-3.5 text-indigo-600" />
          Matching Donors
        </span>
      );
    case 'DONOR_CONTACTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300">
          <Activity className="w-3.5 h-3.5 text-purple-600" />
          Donors Contacted
        </span>
      );
    case 'CANCELLED':
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          {status}
        </span>
      );
    case 'EXPIRED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
          <AlertOctagon className="w-3.5 h-3.5 text-slate-500" />
          Expired
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          Pending
        </span>
      );
  }
};
