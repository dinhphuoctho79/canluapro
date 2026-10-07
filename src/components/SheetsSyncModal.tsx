import React, { useState } from 'react';
import { X, CloudUpload, FileSpreadsheet, Copy, Check, ExternalLink, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { RiceBatch } from '../types';
import { downloadCSV, generateCSV } from '../utils/export';

interface SheetsSyncModalProps {
  batch: RiceBatch;
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
}

export const SheetsSyncModal: React.FC<SheetsSyncModalProps> = ({
  batch,
  isOpen,
  onClose,
  isOnline,
}) => {
  const [webhookUrl, setWebhookUrl] = useState<string>(() => {
    return localStorage.getItem('canlua_google_sheets_webhook') || '';
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Copy as TSV (Tab-separated values) for direct 1-click paste into Google Sheets / Excel cells
  const handleCopyForSheets = () => {
    let tsv = `STT\tTờ số\tKý gộp (kg)\tTrừ bao (kg)\tKý tịnh (kg)\tĐơn giá (đ)\tThành tiền (đ)\n`;
    batch.bags.forEach((bag, idx) => {
      const sheetNum = Math.floor(idx / batch.bagsPerSheet) + 1;
      const tare = batch.tareWeightPerBag;
      const net = Math.max(0, bag.weight - tare);
      const amount = Math.round(net * batch.pricePerKg);
      tsv += `${bag.bagIndex}\t${sheetNum}\t${bag.weight.toFixed(1)}\t${tare.toFixed(1)}\t${net.toFixed(1)}\t${batch.pricePerKg}\t${amount}\n`;
    });

    navigator.clipboard.writeText(tsv);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSyncWebhook = async () => {
    if (!webhookUrl.trim()) return;
    setIsSyncing(true);
    setSyncStatus('idle');

    try {
      localStorage.setItem('canlua_google_sheets_webhook', webhookUrl.trim());

      const payload = {
        code: batch.code,
        farmerName: batch.farmerName,
        farmerPhone: batch.farmerPhone || '',
        riceVariety: batch.riceVariety,
        date: batch.date,
        pricePerKg: batch.pricePerKg,
        tareWeightPerBag: batch.tareWeightPerBag,
        totalBags: batch.bags.length,
        grossWeight: batch.bags.reduce((s, b) => s + b.weight, 0),
        depositAmount: batch.depositAmount,
        bags: batch.bags,
      };

      await fetch(webhookUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'no-cors', // standard for Google Apps Script endpoints
      });

      setSyncStatus('success');
    } catch {
      setSyncStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl text-slate-900 dark:text-white my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Đồng Bộ Google Sheets & Excel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lưu trữ sổ sách mua bán lúa tự động
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2 Fast Offline / Instant Options */}
        <div className="space-y-3 mb-4">
          {/* Option A: Download CSV for Excel */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Tải file Excel (.CSV UTF-8)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Mở bằng Excel trên điện thoại hoặc máy tính không bị lỗi font tiếng Việt
              </p>
            </div>

            <button
              type="button"
              onClick={() => downloadCSV(batch)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
            >
              Tải File
            </button>
          </div>

          {/* Option B: Copy table to paste into Google Sheets */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <Copy className="w-4 h-4 text-blue-600" />
                Chép dữ liệu dán trực tiếp
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Định dạng chuẩn ô bảng tính, bấm xong mở Google Sheets bấm Dán (Ctrl+V)
              </p>
            </div>

            <button
              type="button"
              onClick={handleCopyForSheets}
              className="px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs shrink-0 transition-colors flex items-center gap-1"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
            </button>
          </div>
        </div>

        {/* Option C: Google Sheets Apps Script Webhook Sync */}
        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 mb-4 text-xs">
          <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
            <CloudUpload className="w-3.5 h-3.5 text-emerald-600" />
            Đường dẫn Webhook Google Sheets (Tùy chọn):
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
            Nhập Webhook Google Apps Script để mỗi mẻ cân tự động bắn vào file Trang Tính trên Google Drive của bạn.
          </p>

          <div className="flex gap-1.5">
            <input
              type="url"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-2.5 py-2 font-mono text-[11px] outline-none"
            />
            <button
              type="button"
              onClick={handleSyncWebhook}
              disabled={isSyncing || !webhookUrl.trim() || !isOnline}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl flex items-center gap-1 whitespace-nowrap transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Đang gửi...' : 'Đồng bộ'}</span>
            </button>
          </div>

          {syncStatus === 'success' && (
            <div className="mt-2 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đã đồng bộ thành công mẻ cân lên Google Sheets!</span>
            </div>
          )}

          {syncStatus === 'error' && (
            <div className="mt-2 text-rose-600 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Đã gửi tín hiệu đồng bộ. Vui lòng kiểm tra lại Google Sheet của bạn.</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
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
