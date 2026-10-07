import React from 'react';
import { X, History, Plus, Trash2, CheckCircle2, ChevronRight, Calendar, User, Wheat } from 'lucide-react';
import { RiceBatch } from '../types';
import { formatVND, formatNumber } from '../utils/export';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: RiceBatch[];
  currentBatchId: string;
  onSelectBatch: (batchId: string) => void;
  onNewBatch: () => void;
  onDeleteBatch: (batchId: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  batches,
  currentBatchId,
  onSelectBatch,
  onNewBatch,
  onDeleteBatch,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl text-slate-900 dark:text-white my-auto animate-in zoom-in-95 duration-150 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Lịch Sử Các Mẻ Cân
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lưu trữ an toàn trên thiết bị
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                onNewBatch();
                onClose();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Mẻ Mới</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Batches List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 my-3 pr-1">
          {batches.map((b) => {
            const isCurrent = b.id === currentBatchId;
            const gross = b.bags.reduce((s, bag) => s + bag.weight, 0);
            const net = Math.max(0, gross - b.bags.length * b.tareWeightPerBag);
            const payout = Math.max(0, Math.round(net * b.pricePerKg) - b.depositAmount);

            return (
              <div
                key={b.id}
                className={`p-3.5 rounded-2xl border transition-all text-xs flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-500 dark:border-emerald-700 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                }`}
              >
                <div
                  onClick={() => {
                    onSelectBatch(b.id);
                    onClose();
                  }}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                      {b.farmerName || 'Chưa đặt tên'}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                        Đang chọn
                      </span>
                    )}
                    {b.isPaid && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                        Đã thanh toán
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-[11px] flex-wrap">
                    <span>{b.riceVariety}</span>
                    <span>·</span>
                    <span>{b.date}</span>
                  </div>

                  <div className="mt-2 flex items-center gap-3 font-mono">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {b.bags.length} bao ({formatNumber(net)} kg)
                    </span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                      {formatVND(payout)}
                    </span>
                  </div>
                </div>

                {/* Delete button (prevent deleting if it's the only one) */}
                {batches.length > 1 && (
                  <button
                    onClick={() => onDeleteBatch(b.id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    title="Xóa mẻ cân này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-bold"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
