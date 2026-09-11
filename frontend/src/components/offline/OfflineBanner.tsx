import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, Phone, Hospital, RefreshCw, X, AlertCircle } from 'lucide-react';
import { offlineStorage, OfflineDraftRequest } from '../../services/offlineStorage';
import { useLanguage } from '../../contexts/LanguageContext';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<OfflineDraftRequest[]>([]);
  const { t } = useLanguage();

  const loadPending = async () => {
    try {
      const drafts = await offlineStorage.getPendingRequests();
      setPendingDrafts(drafts);
    } catch {
      // Ignore in unsupported environments
    }
  };

  useEffect(() => {
    loadPending();

    const handleOnline = async () => {
      setIsOnline(true);
      setSyncing(true);
      setSyncStatus('Internet restored. Synchronizing offline actions with central server...');
      try {
        const result = await offlineStorage.syncAllPendingActions();
        if (result.syncedCount > 0) {
          setSyncStatus(`Successfully synchronized ${result.syncedCount} offline request(s)!`);
        } else {
          setSyncStatus('Online and in sync.');
        }
        await loadPending();
      } catch {
        setSyncStatus('Sync attempt failed. Will retry automatically.');
      } finally {
        setSyncing(false);
        setTimeout(() => setSyncStatus(null), 6000);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      loadPending();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !syncStatus) {
    return null;
  }

  return (
    <>
      <div className={`px-4 py-2.5 text-sm font-medium text-white flex items-center justify-between shadow-md transition-colors ${isOnline ? 'bg-emerald-600' : 'bg-amber-600'}`}>
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
          {isOnline ? <Wifi className="w-4 h-4 animate-pulse" /> : <WifiOff className="w-4 h-4" />}
          <span>
            {isOnline
              ? syncStatus
              : `📡 ${t('offlineNotice')} (${pendingDrafts.length} pending draft(s))`
            }
          </span>
          {!isOnline && (
            <button
              onClick={() => setShowModal(true)}
              className="ml-auto bg-white/20 hover:bg-white/30 text-white text-xs px-2.5 py-1 rounded transition"
            >
              Emergency Directory & Queue
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
                  <WifiOff className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">Offline Emergency Resources</h3>
                  <p className="text-xs text-slate-500">Accessible without active internet connection</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* National Emergency Hotline Contacts */}
              <div className="bg-rose-50 border border-rose-100 rounded-lg p-3">
                <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm mb-2">
                  <Phone className="w-4 h-4" />
                  National Emergency Lifelines
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <a href="tel:112" className="flex items-center justify-between p-2 bg-white rounded border border-rose-200 hover:bg-rose-100/50">
                    <span className="font-medium text-slate-800">Unified Emergency</span>
                    <span className="font-bold text-rose-700">112</span>
                  </a>
                  <a href="tel:108" className="flex items-center justify-between p-2 bg-white rounded border border-rose-200 hover:bg-rose-100/50">
                    <span className="font-medium text-slate-800">Ambulance Service</span>
                    <span className="font-bold text-rose-700">108</span>
                  </a>
                  <a href="tel:104" className="flex items-center justify-between p-2 bg-white rounded border border-rose-200 hover:bg-rose-100/50">
                    <span className="font-medium text-slate-800">Blood Bank Helpline</span>
                    <span className="font-bold text-rose-700">104</span>
                  </a>
                  <a href="tel:1077" className="flex items-center justify-between p-2 bg-white rounded border border-rose-200 hover:bg-rose-100/50">
                    <span className="font-medium text-slate-800">Disaster Helpline</span>
                    <span className="font-bold text-rose-700">1077</span>
                  </a>
                </div>
              </div>

              {/* Pending Offline Drafts Queue */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Offline Drafted Requests ({pendingDrafts.length})
                </h4>
                {pendingDrafts.length === 0 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
                    No offline requests waiting. If you submit a blood request without internet, it will be securely staged here and submitted automatically when connection restores.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pendingDrafts.map((d) => (
                      <div key={d.idempotencyKey} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                        <div className="flex items-center justify-between font-bold text-amber-900">
                          <span>{d.patientName} — {d.bloodGroup}</span>
                          <span className="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded">WAITING FOR NETWORK</span>
                        </div>
                        <p className="text-slate-600 mt-1">Hospital: {d.hospitalName}, {d.hospitalCity} | Units: {d.unitsRequired}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5">Created: {new Date(d.createdAt).toLocaleTimeString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
