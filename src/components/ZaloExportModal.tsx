import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  MessageSquare,
  Image,
  FileText,
  Printer,
  Bluetooth,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import { RiceBatch } from '../types';
import { generateReceiptImage, generateZaloTextMessage } from '../utils/export';
import { printReceiptBluetooth, isBluetoothSupported, sanitizeForThermalPrinter } from '../utils/escpos';
import { exportRiceBatchToExcel } from '../utils/excelExport';

interface ZaloExportModalProps {
  batch: RiceBatch;
  isOpen: boolean;
  onClose: () => void;
}

export const ZaloExportModal: React.FC<ZaloExportModalProps> = ({ batch, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'image' | 'text' | 'printer'>('image');
  const [receiptImageUrl, setReceiptImageUrl] = useState<string>('');
  const [zaloText, setZaloText] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Thermal printer state
  const [paperWidth, setPaperWidth] = useState<58 | 80>(58);
  const [printerStatus, setPrinterStatus] = useState<'idle' | 'connecting' | 'printing' | 'success' | 'error'>('idle');
  const [printerError, setPrinterError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    setIsGenerating(true);
    setZaloText(generateZaloTextMessage(batch));
    setPrinterStatus('idle');
    setPrinterError('');

    generateReceiptImage(batch)
      .then((url) => {
        setReceiptImageUrl(url);
        setIsGenerating(false);
      })
      .catch(() => {
        setIsGenerating(false);
      });
  }, [isOpen, batch]);

  if (!isOpen) return null;

  const handleExportExcel = () => {
    try {
      const stored = localStorage.getItem('canlua_mientay_batches_v2');
      const allB = stored ? JSON.parse(stored) : [batch];
      exportRiceBatchToExcel(batch, allB);
    } catch {
      exportRiceBatchToExcel(batch, [batch]);
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(zaloText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleDownloadImage = () => {
    if (!receiptImageUrl) return;
    const link = document.createElement('a');
    link.href = receiptImageUrl;
    const cleanName = (batch.farmerName || 'ChuRuong').replace(/\s+/g, '_');
    link.download = `PhieuCanPro_${cleanName}_${batch.date}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        if (activeTab === 'image' && receiptImageUrl) {
          const res = await fetch(receiptImageUrl);
          const blob = await res.blob();
          const cleanName = (batch.farmerName || 'ChuRuong').replace(/\s+/g, '_');
          const file = new File([blob], `PhieuCanPro_${cleanName}.png`, { type: 'image/png' });
          await navigator.share({
            title: `Phiếu Cân Lúa Pro - ${batch.farmerName || 'Chủ ruộng'}`,
            text: zaloText,
            files: [file],
          });
        } else {
          await navigator.share({
            title: `Phiếu Cân Lúa Pro - ${batch.farmerName || 'Chủ ruộng'}`,
            text: zaloText,
          });
        }
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyText();
    }
  };

  const handlePrintBluetooth = async () => {
    setPrinterStatus('connecting');
    setPrinterError('');

    try {
      setPrinterStatus('printing');
      await printReceiptBluetooth(batch, paperWidth);
      setPrinterStatus('success');
      setTimeout(() => setPrinterStatus('idle'), 4000);
    } catch (err: unknown) {
      setPrinterStatus('error');
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy in Bluetooth.';
      setPrinterError(msg);
    }
  };

  const handleBrowserPrint = () => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>In Phiếu Cân Lúa Pro</title>
            <style>
              body { font-family: monospace; padding: 20px; white-space: pre-wrap; font-size: 14px; }
            </style>
          </head>
          <body>
            <pre>${sanitizeForThermalPrinter(zaloText)}</pre>
          </body>
        </html>
      `);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl text-slate-900 dark:text-white my-auto animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Cân Lúa Pro • Xuất Phiếu &amp; In Cầm Tay
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Gửi Zalo cho chủ ruộng hoặc in phiếu nhiệt Bluetooth chuẩn ESC/POS
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

        {/* Tab switch: Photo vs Text vs Thermal Printer */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl my-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'image'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Image className="w-3.5 h-3.5" />
            <span>Ảnh Hóa Đơn</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'text'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Gửi Zalo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('printer')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
              activeTab === 'printer'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>In Nhiệt Mini</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto min-h-[220px] rounded-2xl bg-slate-100 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800">
          {activeTab === 'image' ? (
            <div className="flex flex-col items-center justify-center">
              {isGenerating ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  Đang xuất ảnh phiếu cân...
                </div>
              ) : receiptImageUrl ? (
                <img
                  src={receiptImageUrl}
                  alt="Phiếu cân lúa"
                  className="w-full max-w-sm rounded-lg shadow-md border border-slate-300 dark:border-slate-700"
                />
              ) : (
                <div className="py-16 text-center text-xs text-slate-400">
                  Không thể tạo ảnh phiếu cân
                </div>
              )}
            </div>
          ) : activeTab === 'text' ? (
            <div className="relative">
              <pre className="font-mono text-xs whitespace-pre-wrap text-slate-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {zaloText}
              </pre>
            </div>
          ) : (
            /* TAB 3: BLUETOOTH THERMAL PRINTER (ESC/POS) */
            <div className="space-y-3">
              {/* Printer paper size selector */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Khổ giấy in nhiệt:
                </span>
                <div className="flex gap-1.5 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPaperWidth(58)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      paperWidth === 58
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    58mm (Cầm tay)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaperWidth(80)}
                    className={`px-3 py-1 rounded-lg transition-all ${
                      paperWidth === 80
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    80mm (Để bàn)
                  </button>
                </div>
              </div>

              {/* Status Alert */}
              {printerStatus === 'success' && (
                <div className="p-3 bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-400 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Đã gửi lệnh in thành công đến máy in Bluetooth!</span>
                </div>
              )}

              {printerStatus === 'error' && (
                <div className="p-3 bg-rose-100 dark:bg-rose-950/80 border border-rose-400 text-rose-800 dark:text-rose-200 rounded-xl text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Lỗi in Bluetooth:</p>
                    <p className="text-[11px] opacity-90">{printerError}</p>
                    <button
                      onClick={handleBrowserPrint}
                      className="mt-1.5 underline font-bold text-rose-700 dark:text-rose-300 block"
                    >
                      Bấm vào đây để in qua hộp thoại in thông thường
                    </button>
                  </div>
                </div>
              )}

              {/* Main Bluetooth Print Trigger Button */}
              <button
                type="button"
                onClick={handlePrintBluetooth}
                disabled={printerStatus === 'connecting' || printerStatus === 'printing'}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50"
              >
                <Bluetooth className="w-5 h-5 animate-pulse" />
                <span>
                  {printerStatus === 'connecting'
                    ? 'Đang dò tìm máy in...'
                    : printerStatus === 'printing'
                    ? 'Đang truyền dữ liệu in...'
                    : `In Phiếu Nhiệt Bluetooth (${paperWidth}mm)`}
                </span>
              </button>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Tương thích các dòng máy in nhiệt mini bỏ túi (Xprinter, PT-210, Zywell, PeriPage, GOOJPRT...) qua Bluetooth không cần cài driver.
              </div>

              {/* Receipt Text Preview */}
              <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 block mb-1">
                  Bản xem trước mẫu in phiếu ({paperWidth}mm):
                </span>
                <pre className="font-mono text-[10px] leading-tight text-slate-700 dark:text-slate-300 overflow-x-auto max-h-40 bg-slate-50 dark:bg-slate-950 p-2 rounded">
                  {sanitizeForThermalPrinter(zaloText)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions for Image & Text */}
        {activeTab !== 'printer' && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3 grid grid-cols-2 gap-2 shrink-0">
            {activeTab === 'image' ? (
              <>
                <button
                  type="button"
                  onClick={handleDownloadImage}
                  disabled={!receiptImageUrl}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải ảnh về máy</span>
                </button>

                <button
                  type="button"
                  onClick={handleWebShare}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Chia sẻ qua Zalo</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="py-2.5 px-3 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{isCopied ? 'Đã chép nội dung!' : 'Sao chép tin nhắn'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleWebShare}
                  className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Gửi thẳng qua Zalo</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Nút Xuất File Excel (.xlsx) */}
        <div className="mt-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
            <span>Xuất File Excel (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
