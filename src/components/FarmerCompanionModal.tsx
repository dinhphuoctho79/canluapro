import React, { useState, useEffect } from 'react';
import { X, Maximize, Minimize, QrCode, Wheat, Sun, Moon, CheckCircle2 } from 'lucide-react';
import QRCode from 'qrcode';
import { RiceBatch, RiceLot } from '../types';
import { formatVND, formatNumber } from '../utils/export';
import { readVietnameseMoney } from '../utils/numberToWords';

interface FarmerCompanionModalProps {
  batch: RiceBatch;
  isOpen: boolean;
  onClose: () => void;
}

export const FarmerCompanionModal: React.FC<FarmerCompanionModalProps> = ({
  batch,
  isOpen,
  onClose,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [shareQrUrl, setShareQrUrl] = useState<string>('');
  const [showQrShare, setShowQrShare] = useState<boolean>(false);

  // Sunlight high-contrast outdoor mode
  const [sunlightMode, setSunlightMode] = useState<boolean>(false);

  const lots: RiceLot[] =
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
    const tWeight = bCount * l.tareWeightPerBag;
    const nWeight = Math.max(0, gWeight - tWeight);
    const amt = Math.round(nWeight * l.pricePerKg);

    totalBags += bCount;
    grossWeight += gWeight;
    totalTare += tWeight;
    netWeight += nWeight;
    totalAmount += amt;
  });

  const porterageFeePerBag = batch.porterageFeePerBag || 0;
  const totalPorterageFee = totalBags * porterageFeePerBag;
  const porteragePayer = batch.porteragePayer || 'buyer';

  let finalPayout = totalAmount - (batch.depositAmount || 0);
  if (porteragePayer === 'farmer') {
    finalPayout -= totalPorterageFee;
  }
  finalPayout = Math.max(0, finalPayout);

  // Find last weighed bag across lots
  let allBags: typeof batch.bags = [];
  lots.forEach((l) => {
    allBags = allBags.concat(l.bags);
  });
  const lastBag = allBags[allBags.length - 1];

  // Generate shareable QR code for the current URL so farmer can scan and view on their phone
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    QRCode.toDataURL(currentUrl, {
      width: 240,
      margin: 1,
      color: { dark: '#020617', light: '#ffffff' },
    })
      .then((url) => setShareQrUrl(url))
      .catch(() => {});
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col p-4 sm:p-6 overflow-y-auto select-none transition-colors duration-200 ${
        sunlightMode ? 'bg-white text-slate-950' : 'bg-[#020617] text-white'
      }`}
    >
      {/* Top action bar */}
      <div
        className={`flex items-center justify-between pb-3 border-b ${
          sunlightMode ? 'border-slate-300' : 'border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></span>
          <span
            className={`font-black text-sm sm:text-base uppercase tracking-wider ${
              sunlightMode ? 'text-emerald-800' : 'text-emerald-400'
            }`}
          >
            MÀN HÌNH NÔNG DÂN (FARMER HUD)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút bật [☀️ Chế độ Ngoài Trời Nắng] */}
          <button
            type="button"
            onClick={() => setSunlightMode(!sunlightMode)}
            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md ${
              sunlightMode
                ? 'bg-amber-400 text-slate-950 border-2 border-amber-600 scale-105'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
            }`}
            title="Chuyển chế độ chữ đen nền trắng siêu tương phản ngoài nắng gắt"
          >
            {sunlightMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 fill-amber-400 text-amber-500" />}
            <span>{sunlightMode ? 'Tắt Chế Độ Nắng' : '☀️ Chế độ Ngoài Trời Nắng'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQrShare(!showQrShare)}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
              sunlightMode ? 'bg-slate-200 text-slate-800' : 'bg-slate-800 text-slate-300'
            }`}
            title="Quét mã QR để xem trên điện thoại nông dân"
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Quét QR trên máy bà con</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-2 rounded-xl ${
              sunlightMode ? 'bg-slate-200 text-slate-800' : 'bg-slate-800 text-slate-300'
            }`}
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className={`p-2 rounded-xl ${
              sunlightMode
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                : 'bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Share QR Dialog */}
      {showQrShare && shareQrUrl && (
        <div
          className={`border rounded-2xl p-4 my-2 max-w-sm mx-auto text-center animate-in slide-in-from-top-4 shadow-xl ${
            sunlightMode ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
          }`}
        >
          <p className="text-xs font-bold mb-2">
            Nông dân dùng Zalo hoặc Camera điện thoại quét mã này để theo dõi cùng lúc:
          </p>
          <img src={shareQrUrl} alt="Mã QR xem trực tiếp" className="w-48 h-48 mx-auto rounded-xl p-2 bg-white" />
          <button
            type="button"
            onClick={() => setShowQrShare(false)}
            className="mt-3 px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-white"
          >
            Đóng bảng QR
          </button>
        </div>
      )}

      {/* Main Big Display Area: Cốt lõi đúng 3 thẻ thông tin cực lớn */}
      <div className="flex-1 flex flex-col justify-center items-center py-4 text-center max-w-2xl mx-auto w-full space-y-4 sm:space-y-5">
        {/* Farmer Header Info Banner */}
        <div
          className={`px-5 py-2 rounded-full inline-flex items-center gap-2 border text-xs sm:text-sm font-bold ${
            sunlightMode
              ? 'bg-slate-100 border-slate-300 text-slate-800'
              : 'bg-slate-900/90 border-slate-800 text-slate-200'
          }`}
        >
          <Wheat className="w-4 h-4 text-amber-500" />
          <span>
            Ruộng của: <strong className="text-emerald-600 dark:text-emerald-400">{batch.farmerName || 'Bà con nông dân'}</strong>
          </span>
          <span className="opacity-40">·</span>
          <span>{batch.riceVariety}</span>
          <span className="opacity-40">·</span>
          <span className="font-mono text-amber-600 dark:text-amber-400 font-extrabold">{formatVND(batch.pricePerKg)}/kg</span>
        </div>

        {/* THẺ 1: SỐ BAO ĐÃ LÊN XE (Đếm tăng dần sau mỗi bao) */}
        <div
          className={`w-full rounded-3xl p-5 sm:p-7 shadow-2xl relative overflow-hidden border-4 transition-colors ${
            sunlightMode
              ? 'bg-slate-50 border-black'
              : 'bg-slate-900 border-emerald-500/80'
          }`}
        >
          <div
            className={`text-xs sm:text-sm font-black uppercase tracking-widest mb-1 ${
              sunlightMode ? 'text-slate-700' : 'text-slate-400'
            }`}
          >
            THẺ 1: SỐ BAO ĐÃ LÊN XE
          </div>

          <div className="flex items-center justify-center gap-3">
            <span
              className={`font-mono text-7xl sm:text-8xl md:text-9xl font-black tracking-tight ${
                sunlightMode
                  ? 'text-black'
                  : 'text-[#4ADE80] drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]'
              }`}
            >
              {totalBags}
            </span>
            <span
              className={`text-3xl sm:text-4xl font-black ${
                sunlightMode ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              BAO
            </span>
          </div>

          {lastBag && (
            <div
              className={`mt-1 font-mono text-xs sm:text-sm font-bold ${
                sunlightMode ? 'text-emerald-800' : 'text-emerald-300'
              }`}
            >
              Bao vừa cân xong: <strong>#{lastBag.bagIndex}</strong> ({lastBag.weight.toFixed(1)} kg)
            </div>
          )}
        </div>

        {/* THẺ 2: TỔNG KÝ TỊNH (Đã trừ bao bì chuẩn 0.2kg/bao) */}
        <div
          className={`w-full rounded-3xl p-5 sm:p-7 shadow-xl border-4 transition-colors ${
            sunlightMode
              ? 'bg-amber-50 border-amber-600 text-black'
              : 'bg-amber-950/40 border-amber-500 text-white'
          }`}
        >
          <div
            className={`text-xs sm:text-sm font-black uppercase tracking-widest mb-1 ${
              sunlightMode ? 'text-amber-950' : 'text-amber-300'
            }`}
          >
            THẺ 2: TỔNG KÝ TỊNH THANH TOÁN (ĐÃ TRỪ VỎ BAO)
          </div>

          <div className="flex items-baseline justify-center gap-2">
            <span
              className={`font-mono text-6xl sm:text-7xl md:text-8xl font-black tracking-tight ${
                sunlightMode ? 'text-black' : 'text-amber-400'
              }`}
            >
              {formatNumber(netWeight)}
            </span>
            <span
              className={`text-2xl sm:text-3xl font-black ${
                sunlightMode ? 'text-slate-800' : 'text-amber-300'
              }`}
            >
              KG
            </span>
          </div>

          <div
            className={`text-xs font-semibold mt-1 ${
              sunlightMode ? 'text-slate-600' : 'text-amber-200/80'
            }`}
          >
            (Ký gộp: {formatNumber(grossWeight)} kg &bull; Đã trừ vỏ bao: -{formatNumber(totalTare)} kg)
          </div>
        </div>

        {/* THẺ 3: TIỀN THỰC LÃNH VỀ TÚI (Đã cấn trừ đủ tiền cọc ứng trước) */}
        <div
          className={`w-full rounded-3xl p-5 sm:p-7 shadow-2xl border-4 transition-colors ${
            sunlightMode
              ? 'bg-emerald-50 border-emerald-600 text-black'
              : 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 border-emerald-400 text-white'
          }`}
        >
          <div
            className={`text-xs sm:text-sm font-black uppercase tracking-widest mb-1 ${
              sunlightMode ? 'text-emerald-950' : 'text-emerald-300'
            }`}
          >
            THẺ 3: TIỀN THỰC LÃNH VỀ TÚI (TIỀN LÚA SAU TRỪ CỌC)
          </div>

          <div
            className={`font-mono text-5xl sm:text-6xl md:text-7xl font-black tracking-tight my-1 ${
              sunlightMode
                ? 'text-emerald-900'
                : 'text-[#4ADE80] drop-shadow-[0_0_25px_rgba(74,222,128,0.6)]'
            }`}
          >
            {formatVND(finalPayout)}
          </div>

          <div
            className={`mt-2 pt-2 border-t text-xs sm:text-sm font-bold italic ${
              sunlightMode ? 'border-emerald-300 text-emerald-900' : 'border-emerald-500/40 text-emerald-300'
            }`}
          >
            Bằng chữ: <span className="font-extrabold text-amber-400">{readVietnameseMoney(finalPayout)}</span>
          </div>

          <div
            className={`text-xs font-semibold mt-1 flex flex-wrap items-center justify-center gap-2 ${
              sunlightMode ? 'text-slate-700' : 'text-emerald-200'
            }`}
          >
            <span>Tổng tiền: {formatVND(totalAmount)}</span>
            {batch.depositAmount > 0 && <span>&bull; Tiền cọc đã ứng: -{formatVND(batch.depositAmount)}</span>}
            {totalPorterageFee > 0 && porteragePayer === 'farmer' && (
              <span>&bull; Trừ tiền vác: -{formatVND(totalPorterageFee)}</span>
            )}
          </div>
        </div>
      </div>

      {/* Footer stamp */}
      <div
        className={`text-center pt-2 text-xs font-mono font-semibold ${
          sunlightMode ? 'text-slate-600' : 'text-slate-500'
        }`}
      >
        Màn hình kiểm đếm bờ ruộng trực tiếp &bull; Cân Lúa Pro
      </div>
    </div>
  );
};
