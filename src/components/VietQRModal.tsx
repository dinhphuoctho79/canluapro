import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Download, Building, CreditCard, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { RiceBatch, BankItem } from '../types';
import { POPULAR_VIETNAMESE_BANKS, getOnlineVietQRUrl, generateOfflineQRCodeDataUrl, removeVietnameseAccents } from '../utils/vietqr';
import { formatVND } from '../utils/export';

interface VietQRModalProps {
  batch: RiceBatch;
  isOpen: boolean;
  onClose: () => void;
  onUpdateBatch: (updates: Partial<RiceBatch>) => void;
  isOnline: boolean;
}

export const VietQRModal: React.FC<VietQRModalProps> = ({
  batch,
  isOpen,
  onClose,
  onUpdateBatch,
  isOnline,
}) => {
  const [selectedBankId, setSelectedBankId] = useState<string>(batch.farmerBankName || 'agribank');
  const [accountNumber, setAccountNumber] = useState<string>(batch.farmerBankNumber || '');
  const [accountName, setAccountName] = useState<string>(batch.farmerName || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Financial calculations supporting multi-lots & porterage
  const lots =
    batch.lots && batch.lots.length > 0
      ? batch.lots
      : [
          {
            id: 'default',
            lotName: 'Lô lúa chính',
            riceVariety: batch.riceVariety,
            pricePerKg: batch.pricePerKg,
            tareWeightPerBag: batch.tareWeightPerBag,
            bags: batch.bags,
          },
        ];

  let totalBags = 0;
  let grossWeight = 0;
  let totalTare = 0;
  let netWeight = 0;
  let totalAmount = 0;

  lots.forEach((l) => {
    const bCount = l.bags.length;
    const gWeight = l.bags.reduce((acc, b) => acc + b.weight, 0);
    const tWeight = bCount * (l.tareWeightPerBag ?? batch.tareWeightPerBag ?? 0.2);
    const nWeight = Math.max(0, gWeight - tWeight);
    const effectivePrice = Number(l.pricePerKg) > 0 ? Number(l.pricePerKg) : (Number(batch.pricePerKg) > 0 ? Number(batch.pricePerKg) : 0);
    const amt = Math.round(nWeight * effectivePrice);

    totalBags += bCount;
    grossWeight += gWeight;
    totalTare += tWeight;
    netWeight += nWeight;
    totalAmount += amt;
  });

  const flatTare = batch.flatTareAmount || 0;
  if (flatTare > 0) {
    netWeight = Math.max(0, grossWeight - flatTare);
    totalAmount = Math.round(netWeight * (Number(batch.pricePerKg) || 0));
  }

  const porterageFeePerBag = batch.porterFeePerBag ?? batch.porterageFeePerBag ?? 0;
  const totalPorterageFee = totalBags * porterageFeePerBag;
  const porteragePayer = batch.porteragePayer || 'buyer';

  let finalPayout = totalAmount - (batch.depositAmount || 0);
  if (porteragePayer === 'farmer') {
    finalPayout -= totalPorterageFee;
  }
  const qrTransferAmount = Math.max(0, finalPayout);

  const selectedBank = POPULAR_VIETNAMESE_BANKS.find((b) => b.id === selectedBankId) || POPULAR_VIETNAMESE_BANKS[0];
  const memo = `TIEN LUA ${removeVietnameseAccents(batch.farmerName || 'CHU RUONG')}`.slice(0, 40);

  // Generate QR Code whenever parameters change
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGenerating(true);

    const bankBin = selectedBank.bin;
    const cleanAccount = accountNumber.trim() || '0000000000';

    if (isOnline) {
      const url = getOnlineVietQRUrl({
        bankBin,
        accountNumber: cleanAccount,
        accountName,
        amount: qrTransferAmount,
        memo,
      });
      setQrDataUrl(url);
      setIsGenerating(false);
    } else {
      // Offline fallback: generate QR code locally
      generateOfflineQRCodeDataUrl({
        bankBin,
        accountNumber: cleanAccount,
        accountName,
        amount: qrTransferAmount,
        memo,
      })
        .then((dataUrl) => {
          if (isMounted) {
            setQrDataUrl(dataUrl);
            setIsGenerating(false);
          }
        })
        .catch(() => {
          if (isMounted) setIsGenerating(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedBank, accountNumber, accountName, finalPayout, memo, isOnline]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveBankInfo = () => {
    onUpdateBatch({
      farmerBankName: selectedBankId,
      farmerBankNumber: accountNumber,
    });
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    const cleanName = (batch.farmerName || 'ChuRuong').replace(/\s+/g, '_');
    a.download = `VietQR_CanLuaPro_${cleanName}_${finalPayout}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl text-slate-900 dark:text-white my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight">
                Cân Lúa Pro - Thanh Toán VietQR Napas247
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chuẩn Napas 247 - Đúng từng đồng
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

        {/* Amount to pay banner */}
        <div className={`rounded-2xl text-white p-3.5 mb-4 shadow-md text-center ${
          finalPayout < 0 ? 'bg-gradient-to-r from-amber-600 to-rose-700' : 'bg-gradient-to-r from-emerald-600 to-teal-700'
        }`}>
          <span className="text-[11px] font-bold uppercase tracking-wider block opacity-90">
            {finalPayout < 0 ? '⚠️ NÔNG DÂN CÒN THIẾU LẠI LÁI' : 'SỐ TIỀN THỰC TRẢ NÔNG DÂN'}
          </span>
          <span className="text-2xl sm:text-3xl font-black font-mono-num tracking-tight block my-0.5">
            {finalPayout < 0 ? `-${formatVND(Math.abs(finalPayout))}` : formatVND(finalPayout)}
          </span>
          <span className="text-[11px] opacity-90 block">
            (Tổng {totalBags} bao lúa · Ký tịnh {netWeight.toFixed(1)} kg)
          </span>
        </div>

        {/* Bank & Account Selector Form */}
        <div className="space-y-2.5 mb-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
              <Building className="w-3.5 h-3.5 text-emerald-600" />
              Ngân hàng của Chủ ruộng:
            </label>
            <select
              value={selectedBankId}
              onChange={(e) => {
                setSelectedBankId(e.target.value);
                onUpdateBatch({ farmerBankName: e.target.value });
              }}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              {POPULAR_VIETNAMESE_BANKS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.shortName} - {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Số tài khoản nhận:
              </label>
              <input
                type="text"
                placeholder="Nhập STK"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value);
                  onUpdateBatch({ farmerBankNumber: e.target.value });
                }}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tên chủ tài khoản:
              </label>
              <input
                type="text"
                placeholder="Tên không dấu"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* QR Code Container */}
        <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 mb-4">
          {accountNumber.trim() ? (
            <>
              <div className="bg-white p-3 rounded-xl shadow-inner mb-2 border border-slate-200">
                {isGenerating ? (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                    Đang tạo mã QR...
                  </div>
                ) : qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="VietQR Napas247"
                    className="w-56 h-auto object-contain mx-auto"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-slate-400">
                    Lỗi tạo QR
                  </div>
                )}
              </div>

              <div className="text-center text-xs text-slate-600 dark:text-slate-300 space-y-0.5">
                <p className="font-semibold text-slate-900 dark:text-white">
                  {selectedBank.shortName} · <span className="font-mono">{accountNumber}</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Nội dung: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{memo}</strong>
                </p>
              </div>
            </>
          ) : (
            <div className="py-8 text-center text-slate-400 text-xs">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-500 opacity-80" />
              <p className="font-bold text-slate-700 dark:text-slate-300">Vui lòng nhập Số tài khoản</p>
              <p>để tự động xuất mã QR chuyển khoản Napas247</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => copyToClipboard(`${selectedBank.shortName} - ${accountNumber} - ${finalPayout} - ${memo}`, 'all')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 transition-colors"
          >
            {copiedField === 'all' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copiedField === 'all' ? 'Đã sao chép' : 'Sao chép số TK'}</span>
          </button>

          <button
            type="button"
            onClick={downloadQR}
            disabled={!accountNumber.trim()}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>Tải ảnh mã QR</span>
          </button>
        </div>

        {/* Confirm Paid button */}
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={batch.isPaid || false}
              onChange={(e) => onUpdateBatch({ isPaid: e.target.checked })}
              className="w-4 h-4 text-emerald-600 rounded"
            />
            <span className="font-bold text-slate-700 dark:text-slate-300">Đã thanh toán xong mẻ này</span>
          </label>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-lg"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
