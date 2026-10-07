import React, { useState } from 'react';
import { Layers, Plus, Wheat, X, Check, Edit2, Trash2 } from 'lucide-react';
import { RiceLot } from '../types';
import { formatVND } from '../utils/export';
import { POPULAR_RICE_VARIETIES } from './HeaderInfo';

interface LotSwitcherProps {
  lots: RiceLot[];
  activeLotId: string;
  onSelectLot: (lotId: string) => void;
  onAddLot: (lot: { lotName: string; riceVariety: string; pricePerKg: number; tareWeightPerBag: number }) => void;
  onDeleteLot?: (lotId: string) => void;
}

export const LotSwitcher: React.FC<LotSwitcherProps> = ({
  lots,
  activeLotId,
  onSelectLot,
  onAddLot,
  onDeleteLot,
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newVariety, setNewVariety] = useState<string>('OM 18');
  const [newLotName, setNewLotName] = useState<string>('');
  const [newPrice, setNewPrice] = useState<number>(8000);
  const [newTare, setNewTare] = useState<number>(0.2);

  const handleCreate = () => {
    const lotNum = lots.length + 1;
    onAddLot({
      lotName: newLotName.trim() || `Lô ${lotNum} - ${newVariety}`,
      riceVariety: newVariety,
      pricePerKg: newPrice,
      tareWeightPerBag: newTare,
    });
    setIsAddModalOpen(false);
    setNewLotName('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 pt-2 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex flex-wrap items-center justify-between gap-2">
        {/* Lot list scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-[85%]">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-1 pr-1.5 shrink-0">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Lô giống:</span>
          </div>

          {lots.map((lot, idx) => {
            const isActive = lot.id === activeLotId;
            const bagCount = lot.bags.length;

            return (
              <button
                key={lot.id}
                type="button"
                onClick={() => onSelectLot(lot.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 border ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm scale-[1.02]'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <Wheat className={`w-3.5 h-3.5 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>
                  {lot.lotName || `Lô ${idx + 1}`} ({lot.riceVariety})
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded-full font-mono text-[10px] ${
                    isActive ? 'bg-emerald-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {bagCount} bao
                </span>
                <span className={`text-[10px] ${isActive ? 'text-emerald-100' : 'text-amber-600 dark:text-amber-400'}`}>
                  {formatVND(lot.pricePerKg)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Add Lot Button */}
        <button
          type="button"
          onClick={() => {
            setNewLotName(`Lô ${lots.length + 1}`);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 shadow-sm transition-all active:scale-95"
          title="Thêm giống lúa khác cân cùng trong mẻ này"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Thêm Giống Lúa</span>
        </button>
      </div>

      {/* Add Lot Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-5 shadow-2xl text-slate-900 dark:text-white animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Wheat className="w-4 h-4 text-emerald-600" />
                Thêm Giống Lúa Cắt Cùng Buổi (Lô Mới)
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tên lô phân biệt:
                </label>
                <input
                  type="text"
                  placeholder="VD: Lô 2 - Ruộng gò"
                  value={newLotName}
                  onChange={(e) => setNewLotName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Giống lúa:
                </label>
                <select
                  value={newVariety}
                  onChange={(e) => setNewVariety(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium outline-none"
                >
                  {POPULAR_RICE_VARIETIES.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                  <option value="Giống khác">Giống khác...</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Đơn giá (đ/kg):
                  </label>
                  <input
                    type="number"
                    step="50"
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold text-amber-600 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Trừ vỏ (kg/bao):
                  </label>
                  <select
                    value={newTare}
                    onChange={(e) => setNewTare(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium outline-none"
                  >
                    <option value={0.2}>0.2 kg</option>
                    <option value={0.15}>0.15 kg</option>
                    <option value={0.1}>0.1 kg</option>
                    <option value={0.3}>0.3 kg</option>
                    <option value={0}>0 kg</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white flex items-center gap-1 shadow-sm"
              >
                <Check className="w-4 h-4" />
                <span>Tạo Lô Mới</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
