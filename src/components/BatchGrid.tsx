import React, { useState, useMemo } from 'react';
import { Undo2, Edit3, Trash2, Check, X, Layers, AlertCircle } from 'lucide-react';
import { BagEntry } from '../types';

interface BatchGridProps {
  bags: BagEntry[];
  bagsPerSheet: number;
  onUndoLastBag: () => void;
  onEditBag: (bagId: string, newWeight: number) => void;
  onDeleteBag: (bagId: string) => void;
}

export const BatchGrid: React.FC<BatchGridProps> = ({
  bags,
  bagsPerSheet,
  onUndoLastBag,
  onEditBag,
  onDeleteBag,
}) => {
  const [activeSheetTab, setActiveSheetTab] = useState<number | 'all'>('all');
  const [editingBag, setEditingBag] = useState<{ id: string; index: number; weight: string } | null>(null);

  // Group bags into sheets
  const sheets = useMemo(() => {
    const list: { sheetNum: number; bags: BagEntry[]; totalGross: number }[] = [];
    const totalSheets = Math.max(1, Math.ceil(bags.length / bagsPerSheet));

    for (let s = 1; s <= totalSheets; s++) {
      const startIndex = (s - 1) * bagsPerSheet;
      const sheetBags = bags.slice(startIndex, startIndex + bagsPerSheet);
      const totalGross = sheetBags.reduce((acc, b) => acc + b.weight, 0);
      list.push({
        sheetNum: s,
        bags: sheetBags,
        totalGross,
      });
    }

    return list;
  }, [bags, bagsPerSheet]);

  // Current sheet list to render
  const visibleSheets = useMemo(() => {
    if (activeSheetTab === 'all') return sheets;
    return sheets.filter((s) => s.sheetNum === activeSheetTab);
  }, [sheets, activeSheetTab]);

  const handleStartEdit = (bag: BagEntry) => {
    setEditingBag({
      id: bag.id,
      index: bag.bagIndex,
      weight: bag.weight.toString(),
    });
  };

  const handleSaveEdit = () => {
    if (!editingBag) return;
    const num = parseFloat(editingBag.weight);
    if (!isNaN(num) && num > 0) {
      onEditBag(editingBag.id, num);
    }
    setEditingBag(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 py-2">
      {/* Header bar with Sheet Tabs and Undo button */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {/* Sheet Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[70%] scrollbar-none">
          <button
            onClick={() => setActiveSheetTab('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1 ${
              activeSheetTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Tất cả ({sheets.length} tờ)</span>
          </button>

          {sheets.map((s) => (
            <button
              key={s.sheetNum}
              onClick={() => setActiveSheetTab(s.sheetNum)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                activeSheetTab === s.sheetNum
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tờ {s.sheetNum} ({s.bags.length}/{bagsPerSheet})
            </button>
          ))}
        </div>

        {/* Undo button */}
        <button
          onClick={onUndoLastBag}
          disabled={bags.length === 0}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            bags.length > 0
              ? 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 active:scale-95'
              : 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
          }`}
          title="Xóa bao vừa nhập cuối cùng"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Bỏ bao vừa nhập</span>
        </button>
      </div>

      {/* Sheets Content */}
      <div className="space-y-3">
        {bags.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center text-slate-400 dark:text-slate-500">
            <p className="text-sm font-semibold mb-1">Chưa có bao lúa nào được ghi</p>
            <p className="text-xs">
              Nhập số ký trên bàn phím rồi bấm <span className="font-bold text-emerald-600">NHẬP</span> để bắt đầu mẻ cân
            </p>
          </div>
        ) : (
          visibleSheets.map((sheet) => (
            <div
              key={sheet.sheetNum}
              className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
            >
              {/* Sheet header */}
              <div className="bg-slate-100/90 dark:bg-slate-800/80 px-3 py-1.5 flex items-center justify-between border-b border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                    TỜ {sheet.sheetNum}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    ({sheet.bags.length} / {bagsPerSheet} bao)
                  </span>
                </div>
                <div className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  {sheet.totalGross.toFixed(1)} kg
                </div>
              </div>

              {/* Grid of bags (4 columns on mobile, clean big touch targets) */}
              <div className="p-2 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
                {sheet.bags.map((bag) => (
                  <button
                    key={bag.id}
                    onClick={() => handleStartEdit(bag)}
                    className="group relative rounded-lg p-1.5 bg-slate-50 dark:bg-slate-800/60 hover:bg-emerald-50 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-left transition-all active:scale-[0.98]"
                    title="Bấm để sửa số ký hoặc xóa bao"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                      <span className="font-mono font-semibold">#{bag.bagIndex.toString().padStart(2, '0')}</span>
                      <Edit3 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-slate-400" />
                    </div>
                    <div className="font-mono-num text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-tight">
                      {bag.weight.toFixed(1)}
                    </div>
                  </button>
                ))}

                {/* Empty placeholders if sheet is not yet full */}
                {Array.from({ length: Math.max(0, bagsPerSheet - sheet.bags.length) }).map((_, i) => (
                  <div
                    key={`placeholder-${i}`}
                    className="rounded-lg p-1.5 border border-dashed border-slate-200 dark:border-slate-800 text-center flex flex-col items-center justify-center min-h-[48px] opacity-40"
                  >
                    <span className="text-[10px] font-mono text-slate-400">
                      #{(sheet.bags.length + i + 1 + (sheet.sheetNum - 1) * bagsPerSheet).toString().padStart(2, '0')}
                    </span>
                    <span className="text-xs text-slate-300 dark:text-slate-600">--.-</span>
                  </div>
                ))}
              </div>

              {/* Sheet Bottom Footer: Quick subtotal summary */}
              <div className="bg-slate-50 dark:bg-slate-950/40 px-3 py-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-600 dark:text-slate-400 font-medium">
                  Chốt Tờ {sheet.sheetNum}: <strong className="text-slate-900 dark:text-white">{sheet.bags.length} bao</strong>
                </span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  Tổng gộp: {sheet.totalGross.toFixed(1)} kg
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Bag Weight Modal */}
      {editingBag && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl max-w-xs w-full p-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                Sửa Bao #{editingBag.index}
              </h3>
              <button
                onClick={() => setEditingBag(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Số ký mới (kg):
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  autoFocus
                  value={editingBag.weight}
                  onChange={(e) => setEditingBag({ ...editingBag, weight: e.target.value })}
                  className="w-full text-2xl font-mono font-bold px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-emerald-500 rounded-xl text-slate-900 dark:text-white outline-none"
                />
                <span className="absolute right-3 top-3 font-mono font-bold text-slate-400">KG</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  onDeleteBag(editingBag.id);
                  setEditingBag(null);
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs hover:bg-rose-200 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa bao</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingBag(null)}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="flex items-center gap-1 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu sửa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
