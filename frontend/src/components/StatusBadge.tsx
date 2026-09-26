import React from 'react';
import { RequestStatus } from '../types';
import {
  CheckCircle2,
  Clock,
  Activity,
  UserCheck,
  XCircle,
  AlertOctagon,
  Navigation,
  MapPin,
  HeartHandshake,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Layers,
} from 'lucide-react';

interface StatusBadgeProps {
  status: RequestStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'FULFILLED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Fulfilled
        </span>
      );
    case 'PARTIALLY_FULFILLED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Layers className="w-3.5 h-3.5 text-amber-600" />
          Partially Fulfilled
        </span>
      );
    case 'BLOOD_RECEIVED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-800 border border-teal-300">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          Blood Received
        </span>
      );
    case 'DONATION_CONFIRMED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-100 text-cyan-800 border border-cyan-300">
          <FileCheck className="w-3.5 h-3.5 text-cyan-600" />
          Hospital Confirmed
        </span>
      );
    case 'DONATION_VERIFICATION_PENDING':
    case 'DONATION_COMPLETED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-300">
          <Clock className="w-3.5 h-3.5 text-indigo-600" />
          Donation Completed
        </span>
      );
    case 'DONATION_STARTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
          <HeartHandshake className="w-3.5 h-3.5 text-rose-600" />
          Donation Started
        </span>
      );
    case 'DONOR_ARRIVED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <MapPin className="w-3.5 h-3.5 text-emerald-600" />
          Donor Arrived
        </span>
      );
    case 'DONOR_TRAVELLING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-300">
          <Navigation className="w-3.5 h-3.5 text-sky-600 animate-bounce" />
          Donor Travelling
        </span>
      );
    case 'DONOR_ACCEPTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
          <UserCheck className="w-3.5 h-3.5 text-blue-600" />
          Donor Accepted
        </span>
      );
    case 'MATCHING':
    case 'VALIDATING':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300 animate-pulse">
          <Activity className="w-3.5 h-3.5 text-purple-600" />
          Matching Donors
        </span>
      );
    case 'DONOR_CONTACTED':
    case 'DONORS_FOUND':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-800 border border-violet-300">
          <Activity className="w-3.5 h-3.5 text-violet-600" />
          Donors Contacted
        </span>
      );
    case 'FULFILLMENT_ISSUE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Issue Under Investigation
        </span>
      );
    case 'CANCELLED':
    case 'REJECTED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          {status.replace(/_/g, ' ')}
        </span>
      );
    case 'EXPIRED':
    case 'UNABLE_TO_FULFILL':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
          <AlertOctagon className="w-3.5 h-3.5 text-slate-500" />
          {status.replace(/_/g, ' ')}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          {String(status).replace(/_/g, ' ')}
        </span>
      );
  }
};
