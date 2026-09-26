import React, { useState, useEffect, useCallback } from 'react';
import { campApi } from '../../services/api';
import { BloodDonationCamp } from '../../types';
import {
  Calendar,
  ShieldCheck,
  RefreshCw,
  Upload,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  MapPin,
  ExternalLink,
  Search,
  Filter,
  Eye,
  X,
  FileText,
  Building2,
  Info,
} from 'lucide-react';

export const AdminCampsPage: React.FC = () => {
  const [camps, setCamps] = useState<BloodDonationCamp[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'CANCELLED' | 'LOGS'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Action State
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importing, setImporting] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<BloodDonationCamp | null>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [campsRes, syncRes] = await Promise.all([
        campApi.list({
          status: 'ALL',
          includeCompleted: true,
          limit: 100,
        } as any),
        campApi.getSyncStatus(),
      ]);

      setCamps(campsRes.data?.data || []);
      setSyncStatus(syncRes.data?.data || null);
    } catch (err: any) {
      console.error('[AdminCampsPage] Error loading data:', err);
      showToast('Failed to load camp administration data.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Trigger e-RaktKosh synchronization
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await campApi.adminSync();
      showToast(res.data?.message || 'Sync completed successfully.', res.data?.data?.success ? 'success' : 'info');
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Synchronization request failed.', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Verify a pending camp
  const handleVerifyCamp = async (campId: string) => {
    setActionLoading(true);
    try {
      await campApi.verifyCamp(campId, verificationNotes);
      showToast('Camp verified and published to public discovery!', 'success');
      setSelectedCamp(null);
      setVerificationNotes('');
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Verification failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Reject a pending camp
  const handleRejectCamp = async (campId: string) => {
    const reason = window.prompt('Enter rejection reason for audit log:');
    if (reason === null) return;

    setActionLoading(true);
    try {
      await campApi.rejectCamp(campId, reason);
      showToast('Camp rejected.', 'info');
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Rejection failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel an active camp
  const handleCancelCamp = async (campId: string) => {
    const reason = window.prompt('Enter cancellation reason (e.g. Weather disruption, venue unavailable):');
    if (reason === null) return;

    setActionLoading(true);
    try {
      await campApi.cancelCamp(campId, reason);
      showToast('Camp marked as cancelled.', 'info');
      await loadData();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Cancellation failed.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Process Batch Import
  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    try {
      const parsed = JSON.parse(importJsonText);
      const records = Array.isArray(parsed) ? parsed : [parsed];

      const res = await campApi.adminImport(records, 'OFFICIAL_IMPORT');
      showToast(res.data?.message || 'Batch import processed successfully.', 'success');
      setIsImportModalOpen(false);
      setImportJsonText('');
      await loadData();
    } catch (err: any) {
      showToast(
        err instanceof SyntaxError
          ? 'Invalid JSON syntax. Please verify array structure.'
          : err.response?.data?.message || 'Import failed.',
        'error'
      );
    } finally {
      setImporting(false);
    }
  };

  // Filtered camps based on active tab and search query
  const filteredCamps = camps.filter((camp) => {
    const matchesSearch =
      camp.campName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.organizerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      camp.venue.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (activeTab === 'ALL') return true;
    if (activeTab === 'PENDING') return camp.verificationStatus === 'PENDING';
    if (activeTab === 'VERIFIED') return camp.verificationStatus === 'VERIFIED' && camp.status !== 'COMPLETED' && camp.status !== 'CANCELLED';
    if (activeTab === 'EXPIRED') return camp.status === 'COMPLETED' || camp.status === 'EXPIRED';
    if (activeTab === 'CANCELLED') return camp.status === 'CANCELLED';
    return true;
  });

  const pendingCount = camps.filter((c) => c.verificationStatus === 'PENDING').length;
  const verifiedCount = camps.filter((c) => c.verificationStatus === 'VERIFIED').length;
  const expiredCount = camps.filter((c) => c.status === 'COMPLETED' || c.status === 'EXPIRED').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Alert */}
      {message && (
        <div
          className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-semibold max-w-xl mx-auto shadow-md border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : message.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-indigo-50 border-indigo-200 text-indigo-900'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xs">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Source Integration
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            Blood Donation Camps Administration
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative MoHFW e-RaktKosh synchronization, hospital submission verification, and deduplication.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 font-bold text-xs shadow-2xs transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-rose-600 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronizing...' : 'Sync e-RaktKosh'}
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Official Data
          </button>
        </div>
      </div>

      {/* Synchronization Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Verified Public Camps
          </span>
          <div className="text-2xl font-black text-slate-900">{verifiedCount}</div>
          <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 100% Genuine Records
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Pending Approval
          </span>
          <div className="text-2xl font-black text-amber-600">{pendingCount}</div>
          <span className="text-[11px] font-medium text-slate-500">
            Awaiting Admin Verification
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Past / Completed
          </span>
          <div className="text-2xl font-black text-slate-700">{expiredCount}</div>
          <span className="text-[11px] font-medium text-slate-500">
            Auto-Excluded from Discovery
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Source Status
          </span>
          <div className="text-base font-bold text-slate-900 truncate">
            {syncStatus?.lastSync ? syncStatus.lastSync.source : 'Authoritative Feed'}
          </div>
          <span className="text-[11px] font-medium text-slate-500 truncate block">
            {syncStatus?.lastSync?.syncedAt
              ? `Synced ${new Date(syncStatus.lastSync.syncedAt).toLocaleTimeString()}`
              : 'Standby'}
          </span>
        </div>
      </div>

      {/* Tabs and Search Controls */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'PENDING', label: 'Pending Verification', badge: pendingCount },
              { id: 'VERIFIED', label: 'Verified Public', badge: verifiedCount },
              { id: 'ALL', label: 'All Camps', badge: camps.length },
              { id: 'EXPIRED', label: 'Expired / Past', badge: expiredCount },
              { id: 'CANCELLED', label: 'Cancelled' },
              { id: 'LOGS', label: 'Sync Logs' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex items-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-white text-slate-700 border border-slate-200'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {activeTab !== 'LOGS' && (
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search camps, city, organizer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </div>
          )}
        </div>

        {/* Sync Logs Tab Content */}
        {activeTab === 'LOGS' ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Recent Synchronization History</h3>
            {syncStatus?.recentLogs?.length > 0 ? (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                {syncStatus.recentLogs.map((log: any) => (
                  <div key={log.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                            log.status === 'SUCCESS'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {log.status}
                        </span>
                        <strong className="text-slate-900 font-bold">{log.source}</strong>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-500">{new Date(log.syncedAt).toLocaleString()}</span>
                      </div>
                      {log.errorMessage && (
                        <p className="text-slate-600 text-[11px] leading-relaxed">{log.errorMessage}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span>Fetched: <strong>{log.campsFetched}</strong></span>
                      <span>Inserted: <strong className="text-emerald-600">+{log.campsInserted}</strong></span>
                      <span>Updated: <strong>{log.campsUpdated}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
                No synchronization logs recorded yet.
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="p-12 text-center text-xs text-slate-400 animate-pulse">
            Loading camps registry...
          </div>
        ) : filteredCamps.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
            {filteredCamps.map((camp) => (
              <div key={camp.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        camp.source === 'E_RAKTKOSH'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {camp.source === 'E_RAKTKOSH' ? 'e-RaktKosh' : 'RakthaSethu'}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
                        camp.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : camp.verificationStatus === 'PENDING'
                          ? 'bg-amber-50 text-amber-700 animate-pulse'
                          : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {camp.verificationStatus}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      {camp.status}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-slate-900">{camp.campName}</h4>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(camp.campDate).toLocaleDateString()} ({camp.startTime} – {camp.endTime})
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {camp.venue}, {camp.city}, {camp.state}
                    </span>
                    <span>Org: <strong className="text-slate-700">{camp.organizerName}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  {camp.verificationStatus === 'PENDING' && (
                    <>
                      <button
                        onClick={() => setSelectedCamp(camp)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors"
                      >
                        Verify & Publish
                      </button>
                      <button
                        onClick={() => handleRejectCamp(camp.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs transition-colors"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {camp.verificationStatus === 'VERIFIED' && camp.status !== 'CANCELLED' && (
                    <button
                      onClick={() => handleCancelCamp(camp.id)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors"
                    >
                      Cancel Camp
                    </button>
                  )}

                  {camp.sourceUrl && (
                    <a
                      href={camp.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-slate-700"
                      title="View Official Source"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-slate-500 bg-slate-50 rounded-2xl">
            No blood donation camps matching the selected criteria.
          </div>
        )}
      </div>

      {/* Verification Approval Modal */}
      {selectedCamp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Verify & Approve Camp</h3>
              <button onClick={() => setSelectedCamp(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              You are about to verify <strong>"{selectedCamp.campName}"</strong>. Upon approval, this camp will
              immediately become visible on the public discovery map and nearby registered donors with notification
              preferences will receive an alert.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Verification Audit Notes</label>
              <textarea
                rows={3}
                placeholder="e.g. Verified organizer credentials and hospital affiliation."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedCamp(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerifyCamp(selectedCamp.id)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs disabled:opacity-50"
              >
                {actionLoading ? 'Approving...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Import Verified Camp Dataset</h3>
                <p className="text-xs text-slate-500">
                  Paste official e-RaktKosh / State Council JSON records for authoritative ingestion.
                </p>
              </div>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">JSON Camp Array</label>
                <textarea
                  required
                  rows={8}
                  placeholder={`[
  {
    "sourceCampId": "ERAKTKOSH-DL-01",
    "campName": "Red Cross Capital Blood Drive",
    "venue": "Red Cross Bhawan",
    "address": "1 Red Cross Road",
    "city": "New Delhi",
    "state": "Delhi",
    "campDate": "2026-10-05",
    "startTime": "09:00",
    "endTime": "16:00",
    "organizerName": "Indian Red Cross Society"
  }
]`}
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
                >
                  {importing ? 'Processing Import...' : 'Import Dataset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
