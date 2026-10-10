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
import { ResponsiveTable, Column } from '../../components/common/ResponsiveTable';

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

  const columns: Column<any>[] = [
    {
      header: 'Batch Number',
      accessor: (row) => <span className="font-mono font-bold text-slate-800">{row.batchNumber}</span>,
    },
    {
      header: 'Blood Group',
      accessor: (row) => <BloodGroupBadge bloodGroup={row.bloodGroup} size="sm" />,
    },
    {
      header: 'Component Type',
      accessor: (row) => <span className="font-semibold text-slate-700">{row.componentType.replace(/_/g, ' ')}</span>,
    },
    {
      header: 'Units',
      accessor: (row) => <span className="font-black text-slate-900">{row.units} Units</span>,
    },
    {
      header: 'Collection Date',
      accessor: (row) => <span className="text-slate-500">{new Date(row.collectionDate).toLocaleDateString()}</span>,
    },
    {
      header: 'Expiry Date',
      accessor: (row) => {
        const isExpiringSoon = new Date(row.expiryDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;
        return (
          <span className={`inline-flex items-center gap-1 ${isExpiringSoon ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
            {isExpiringSoon && <AlertTriangle className="w-3.5 h-3.5" />}
            {new Date(row.expiryDate).toLocaleDateString()}
          </span>
        );
      },
    },
    {
      header: 'Status',
      accessor: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded-md text-xs font-bold ${
            row.status === 'AVAILABLE'
              ? 'bg-emerald-50 text-emerald-700'
              : row.status === 'RESERVED'
              ? 'bg-blue-50 text-blue-700'
              : 'bg-rose-50 text-rose-700'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      accessor: (row) => (
        <select
          value={row.status}
          onChange={(e) => handleUpdateStatus(row.id, e.target.value)}
          className="px-2 py-1 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
        >
          <option value="AVAILABLE">Available</option>
          <option value="RESERVED">Reserved</option>
          <option value="EXPIRED">Expired</option>
          <option value="DISCARDED">Discarded</option>
        </select>
      ),
    },
  ];

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

      {/* Inventory Responsive Table / Cards */}
      <ResponsiveTable
        columns={columns}
        data={inventory?.items || []}
        isLoading={loading}
        keyExtractor={(item: any) => item.id}
        emptyState={
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-800">No Inventory Batches Found</p>
            <p className="text-xs text-slate-400 mt-1">
              Add refrigerated whole blood or component batches to begin tracking stock.
            </p>
          </div>
        }
        renderMobileCard={(item: any) => {
          const isExpiringSoon =
            new Date(item.expiryDate).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

          return (
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BloodGroupBadge bloodGroup={item.bloodGroup} size="sm" />
                  <span className="font-mono font-bold text-slate-800 text-xs">{item.batchNumber}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                    item.status === 'AVAILABLE'
                      ? 'bg-emerald-50 text-emerald-700'
                      : item.status === 'RESERVED'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-rose-50 text-rose-700'
                  }`}
                >
                  {item.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Component</span>
                  <span className="font-semibold text-slate-700">{item.componentType.replace(/_/g, ' ')}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Stock</span>
                  <span className="font-black text-slate-900">{item.units} Units</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Collected</span>
                  <span className="text-slate-600">{new Date(item.collectionDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Expiry</span>
                  <span className={`inline-flex items-center gap-1 ${isExpiringSoon ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                    {isExpiringSoon && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                    {new Date(item.expiryDate).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-slate-500">Update Status:</span>
                <select
                  value={item.status}
                  onChange={(e) => handleUpdateStatus(item.id, e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-800"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="DISCARDED">Discarded</option>
                </select>
              </div>
            </div>
          );
        }}
      />

      {/* Add Batch Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-xl space-y-5">
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
