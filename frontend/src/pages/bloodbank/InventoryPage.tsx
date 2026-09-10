import React, { useState, useEffect } from 'react';
import { bloodBankApi } from '../../services/api';
import { BloodGroupBadge } from '../../components/BloodGroupBadge';
import { BloodGroup, ComponentType } from '../../types';
import {
  Package,
  PlusCircle,
  Clock,
  AlertTriangle,
  X,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const [inventory, setInventory] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form states
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>('O_POSITIVE');
  const [componentType, setComponentType] = useState<ComponentType>('WHOLE_BLOOD');
  const [units, setUnits] = useState<number>(5);
  const [batchNumber, setBatchNumber] = useState('');
  const [collectionDate, setCollectionDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchInventory = async () => {
    try {
      const res = await bloodBankApi.getInventory();
      setInventory(res.data?.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bloodBankApi.addBatch({
        bloodGroup,
        componentType,
        units,
        batchNumber: batchNumber || undefined,
        collectionDate,
      });

      setMessage('New blood inventory batch added successfully!');
      setModalOpen(false);
      setBatchNumber('');
      fetchInventory();
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Failed to add batch');
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await bloodBankApi.updateStatus(id, { status: newStatus });
      fetchInventory();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Refrigerated Blood Inventory</h1>
          <p className="text-xs text-slate-500">
            Track blood units, cold-chain batches, component types, and expiry dates.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Add Inventory Batch
        </button>
      </div>

      {message && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {message}
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <th className="p-4">Batch Number</th>
                <th className="p-4">Blood Group</th>
                <th className="p-4">Component Type</th>
                <th className="p-4">Units</th>
                <th className="p-4">Collection Date</th>
                <th className="p-4">Expiry Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory?.items?.map((item: any) => {
                const isExpiringSoon =
                  new Date(item.expiryDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-800">{item.batchNumber}</td>
                    <td className="p-4">
                      <BloodGroupBadge bloodGroup={item.bloodGroup} size="sm" />
                    </td>
                    <td className="p-4 font-semibold text-slate-700">
                      {item.componentType.replace(/_/g, ' ')}
                    </td>
                    <td className="p-4 font-black text-slate-900">{item.units} Units</td>
                    <td className="p-4 text-slate-500">
                      {new Date(item.collectionDate).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 ${
                          isExpiringSoon ? 'text-rose-600 font-bold' : 'text-slate-600'
                        }`}
                      >
                        {isExpiringSoon && <AlertTriangle className="w-3.5 h-3.5" />}
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
                          item.status === 'AVAILABLE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : item.status === 'RESERVED'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <select
                        value={item.status}
                        onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                      >
                        <option value="AVAILABLE">Available</option>
                        <option value="RESERVED">Reserved</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="DISCARDED">Discarded</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Batch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Add Blood Inventory Batch</h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBatch} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Blood Group *
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value as BloodGroup)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold text-rose-700"
                >
                  <option value="O_POSITIVE">O+</option>
                  <option value="O_NEGATIVE">O-</option>
                  <option value="A_POSITIVE">A+</option>
                  <option value="A_NEGATIVE">A-</option>
                  <option value="B_POSITIVE">B+</option>
                  <option value="B_NEGATIVE">B-</option>
                  <option value="AB_POSITIVE">AB+</option>
                  <option value="AB_NEGATIVE">AB-</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Component Type *
                </label>
                <select
                  value={componentType}
                  onChange={(e) => setComponentType(e.target.value as ComponentType)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                >
                  <option value="WHOLE_BLOOD">Whole Blood</option>
                  <option value="PACKED_RED_CELLS">Packed Red Cells (PRBC)</option>
                  <option value="PLATELETS">Platelets</option>
                  <option value="FRESH_FROZEN_PLASMA">Fresh Frozen Plasma (FFP)</option>
                  <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Units *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={units}
                    onChange={(e) => setUnits(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">
                    Collection Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Custom Batch Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Auto-generated if blank"
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow transition-colors"
              >
                Add Batch to Inventory
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
