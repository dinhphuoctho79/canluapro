import React, { useState, useEffect } from 'react';
import { X, Maximize, Minimize, QrCode, Wheat, Sun, Moon, ShieldCheck } from 'lucide-react';
import QRCode from 'qrcode';
import { RiceBatch, RiceLot } from '../types';
import { formatVND, formatNumber } from '../utils/export';
import { readVietnameseMoney, readVietnameseWeight, readVietnameseBags } from '../utils/numberToWords';

interface FarmerCompanionModalProps {
  batch: RiceBatch;
  isOpen: boolean;
  onClose: () => void;
  isReadOnlyHUD?: boolean;
}

export const FarmerCompanionModal: React.FC<FarmerCompanionModalProps> = ({
  batch,
  isOpen,
  onClose,
  isReadOnlyHUD = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [shareQrUrl, setShareQrUrl] = useState<string>('');
  const [showQrShare, setShowQrShare] = useState<boolean>(false);

  // Sunlight high-contrast outdoor mode (Mặc định nền tối AMOLED, bật để thành nền trắng đen siêu tương phản ngoài nắng)
  const [sunlightMode, setSunlightMode] = useState<boolean>(false);

  // Kiểm tra nếu query param có mode=farmer hoặc hud=1
  const isUrlFarmerMode = typeof window !== 'undefined' && 
    (new URLSearchParams(window.location.search).get('mode') === 'farmer' ||
     new URLSearchParams(window.location.search).get('hud') === '1');

  const isStrictReadOnly = isReadOnlyHUD || isUrlFarmerMode;

  // Khóa phím Back và cử chỉ vuốt mép màn hình điện thoại (Kiosk Lock)
  useEffect(() => {
    if (!isStrictReadOnly || typeof window === 'undefined') return;

    window.history.pushState({ hudKiosk: true }, '', window.location.href);

    const handlePopState = () => {
      // Giữ nguyên ở màn hình HUD, không cho nhảy sang màn hình nhập cân
      window.history.pushState({ hudKiosk: true }, '', window.location.href);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isStrictReadOnly]);

  // Chuẩn hóa danh sách lô lúa
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
    const tarePerBag = typeof l.tareWeightPerBag === 'number' && l.tareWeightPerBag >= 0
      ? l.tareWeightPerBag
      : (typeof batch.tareWeightPerBag === 'number' ? batch.tareWeightPerBag : 0.2);
    const tWeight = bCount * tarePerBag;
    const nWeight = Math.max(0, gWeight - tWeight);
    const effectivePrice = (typeof l.pricePerKg === 'number' && l.pricePerKg > 0)
      ? l.pricePerKg
      : (batch.pricePerKg || 0);
    const amt = Math.round(nWeight * effectivePrice);

    totalBags += bCount;
    grossWeight += gWeight;
    totalTare += tWeight;
    netWeight += nWeight;
    totalAmount += amt;
  });

  const flatTare = batch.flatTareAmount || 0;
  if (flatTare > 0) {
    totalTare = flatTare;
    netWeight = Math.max(0, grossWeight - totalTare);
  }

  const porterageFeePerBag = batch.porterFeePerBag ?? batch.porterageFeePerBag ?? 0;
  const totalPorterageFee = totalBags * porterageFeePerBag;
  const porteragePayer = batch.porterPayer ?? batch.porteragePayer ?? 'buyer';

  let finalPayout = totalAmount - (batch.depositAmount || 0);
  if (porteragePayer === 'farmer') {
    finalPayout -= totalPorterageFee;
  } else if (porteragePayer === 'split') {
    finalPayout -= totalPorterageFee / 2;
  }
  const isFarmerOwing = finalPayout < 0;

  // Tìm bao vừa cân gần nhất
  let allBags: typeof batch.bags = [];
  lots.forEach((l) => {
    allBags = allBags.concat(l.bags);
  });
  const lastBag = allBags[allBags.length - 1];

  // Sinh mã QR kèm param ?mode=farmer & ?room=[MÃ_MẺ] để bà con quét xem trực tiếp
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    try {
      const urlObj = new URL(window.location.href);
      urlObj.searchParams.set('mode', 'farmer');
      const roomIdentifier = batch.code || batch.id;
      if (roomIdentifier) {
        urlObj.searchParams.set('room', roomIdentifier);
        urlObj.searchParams.set('batch', roomIdentifier);
      }
      QRCode.toDataURL(urlObj.toString(), {
        width: 240,
        margin: 1,
        color: { dark: '#020617', light: '#ffffff' },
      })
        .then((url) => setShareQrUrl(url))
        .catch(() => {});
    } catch {
      // fallback
    }
  }, [isOpen, batch.code, batch.id]);

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
      className={`fixed inset-0 z-50 flex flex-col min-h-[100dvh] w-full overflow-y-auto select-none transition-colors duration-200 ${
        sunlightMode ? 'bg-white text-slate-950' : 'bg-[#020617] text-white'
      } pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]`}
    >
      {/* 1. THANH TRẠNG THÁI HUD TRÊN CÙNG */}
      <div
        className={`flex items-center justify-between pb-2.5 sm:pb-3 border-b shrink-0 max-w-3xl mx-auto w-full ${
          sunlightMode ? 'border-slate-300' : 'border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
          <span
            className={`font-black text-xs sm:text-base uppercase tracking-wider truncate ${
              sunlightMode ? 'text-emerald-800' : 'text-emerald-400'
            }`}
          >
            MÀN HÌNH NÔNG DÂN (FARMER HUD)
          </span>
          {isStrictReadOnly && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Chế độ chỉ xem
            </span>
          )}
        </div>

        {/* Nút hành động tiện ích */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Nút bật/tắt [☀️ Chế độ Ngoài Trời Nắng] */}
          <button
            type="button"
            onClick={() => setSunlightMode(!sunlightMode)}
            className={`px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm ${
              sunlightMode
                ? 'bg-amber-400 text-slate-950 border-2 border-amber-600 scale-105 font-bold'
                : 'bg-slate-800/90 hover:bg-slate-700 text-amber-300 border border-slate-700'
            }`}
            title="Chuyển chế độ chữ đen nền trắng siêu tương phản ngoài nắng gắt"
          >
            {sunlightMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />}
            <span className="text-[11px] sm:text-xs">{sunlightMode ? 'Tắt Nắng' : '☀️ Chống Chói Nắng'}</span>
          </button>

          {/* Nút mã QR (chỉ hiển thị trên máy thợ cân, ẩn hoàn toàn trên điện thoại nông dân) */}
          {!isStrictReadOnly && (
            <button
              type="button"
              onClick={() => setShowQrShare(!showQrShare)}
              className={`p-1.5 sm:p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors ${
                sunlightMode ? 'bg-slate-200 text-slate-800' : 'bg-slate-800 text-slate-300'
              }`}
              title="Quét mã QR để mở trên điện thoại nông dân"
            >
              <QrCode className="w-4 h-4 text-emerald-500" />
              <span className="hidden md:inline">Chia sẻ QR</span>
            </button>
          )}

          {/* Nút Toàn màn hình */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
              sunlightMode ? 'bg-slate-200 text-slate-800' : 'bg-slate-800 text-slate-300'
            }`}
            title="Toàn màn hình"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>

          {/* Nút Đóng (Chỉ có trên máy thợ cân, khóa và ẩn 100% trên điện thoại nông dân) */}
          {!isStrictReadOnly && (
            <button
              type="button"
              onClick={onClose}
              className={`p-1.5 sm:p-2 rounded-xl transition-colors ${
                sunlightMode
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                  : 'bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white'
              }`}
              title="Đóng màn hình HUD"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Popup chia sẻ QR (chỉ mở khi thợ cân click) */}
      {!isStrictReadOnly && showQrShare && shareQrUrl && (
        <div
          className={`border rounded-2xl p-4 my-2 max-w-sm mx-auto text-center animate-in slide-in-from-top-4 shadow-xl shrink-0 ${
            sunlightMode ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
          }`}
        >
          <p className="text-xs font-bold mb-2">
            Nông dân dùng Zalo hoặc Camera điện thoại quét mã này để theo dõi cùng lúc:
          </p>
          <img src={shareQrUrl} alt="Mã QR xem trực tiếp" className="w-44 h-44 sm:w-48 sm:h-48 mx-auto rounded-xl p-2 bg-white" />
          <button
            type="button"
            onClick={() => setShowQrShare(false)}
            className="mt-3 px-4 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-white hover:bg-slate-700"
          >
            Đóng bảng QR
          </button>
        </div>
      )}

      {/* 2. KHU VỰC 3 THẺ THÔNG TIN CỐT LÕI (RESPONSIVE CHỐNG MẤT CHỮ TRÊN ANDROID & IOS) */}
      <div className="flex-1 flex flex-col justify-center items-center py-3 sm:py-4 text-center max-w-2xl mx-auto w-full space-y-3 sm:space-y-4">
        {/* Banner thông tin ruộng */}
        <div
          className={`px-3.5 py-1.5 sm:px-5 sm:py-2 rounded-full inline-flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 border text-[11px] sm:text-xs font-bold max-w-full ${
            sunlightMode
              ? 'bg-slate-100 border-slate-300 text-slate-800'
              : 'bg-slate-900/90 border-slate-800 text-slate-200'
          }`}
        >
          <div className="flex items-center gap-1">
            <Wheat className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Ruộng: <strong className="text-emerald-600 dark:text-emerald-400">{batch.farmerName || 'Bà con nông dân'}</strong></span>
          </div>
          <span className="opacity-40">&bull;</span>
          <span className="truncate">{batch.riceVariety || 'Lúa thường'}</span>
          <span className="opacity-40">&bull;</span>
          <span className="font-mono text-amber-600 dark:text-amber-400 font-extrabold">{formatVND(batch.pricePerKg)}/kg</span>
        </div>

        {/* THẺ 1: SỐ BAO ĐÃ LÊN XE */}
        <div
          className={`w-full rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-xl relative overflow-hidden border-2 sm:border-4 transition-colors ${
            sunlightMode
              ? 'bg-slate-50 border-black text-black'
              : 'bg-slate-900/95 border-emerald-500/80 text-white'
          }`}
        >
          <div
            className={`text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-wider mb-1 ${
              sunlightMode ? 'text-slate-700' : 'text-slate-400'
            }`}
          >
            THẺ 1: SỐ BAO ĐÃ LÊN XE
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3 py-0.5 sm:py-1">
            <span
              className={`font-mono text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-tight leading-none ${
                sunlightMode
                  ? 'text-black'
                  : 'text-[#4ADE80] drop-shadow-[0_0_20px_rgba(74,222,128,0.5)]'
              }`}
            >
              {totalBags}
            </span>
            <span
              className={`text-2xl sm:text-3xl md:text-4xl font-black ${
                sunlightMode ? 'text-slate-800' : 'text-slate-400'
              }`}
            >
              BAO
            </span>
          </div>

          {/* DÒNG "BẰNG CHỮ" CHO THẺ 1 */}
          <div
            className={`mt-2 pt-2 border-t text-xs sm:text-sm font-bold italic break-words leading-snug ${
              sunlightMode ? 'border-slate-300 text-slate-800' : 'border-emerald-500/40 text-emerald-300'
            }`}
          >
            Bằng chữ: <span className="font-extrabold text-amber-500 dark:text-amber-400">{readVietnameseBags(totalBags)}</span>
          </div>

          {lastBag && (
            <div
              className={`mt-1 font-mono text-[11px] sm:text-xs font-bold ${
                sunlightMode ? 'text-emerald-800' : 'text-emerald-400/90'
              }`}
            >
              Bao vừa cân: <strong>#{lastBag.bagIndex}</strong> ({lastBag.weight.toFixed(1)} kg)
            </div>
          )}
        </div>

        {/* THẺ 2: TỔNG KÝ TỊNH THANH TOÁN (ĐÃ TRỪ VỎ BAO) */}
        <div
          className={`w-full rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-xl border-2 sm:border-4 transition-colors ${
            sunlightMode
              ? 'bg-amber-50 border-amber-600 text-black'
              : 'bg-amber-950/40 border-amber-500 text-white'
          }`}
        >
          <div
            className={`text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-wider mb-1 ${
              sunlightMode ? 'text-amber-950' : 'text-amber-300'
            }`}
          >
            THẺ 2: TỔNG KÝ TỊNH THANH TOÁN (ĐÃ TRỪ VỎ BAO)
          </div>

          <div className="flex items-baseline justify-center gap-1.5 sm:gap-2 py-0.5 sm:py-1">
            <span
              className={`font-mono text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight leading-none ${
                sunlightMode ? 'text-black' : 'text-amber-400'
              }`}
            >
              {formatNumber(netWeight)}
            </span>
            <span
              className={`text-xl sm:text-2xl md:text-3xl font-black ${
                sunlightMode ? 'text-slate-800' : 'text-amber-300'
              }`}
            >
              KG
            </span>
          </div>

          {/* DÒNG "BẰNG CHỮ" CHO THẺ 2 */}
          <div
            className={`mt-2 pt-2 border-t text-xs sm:text-sm font-bold italic break-words leading-snug ${
              sunlightMode ? 'border-amber-300 text-amber-950' : 'border-amber-500/40 text-amber-300'
            }`}
          >
            Bằng chữ: <span className="font-extrabold text-amber-500 dark:text-amber-400">{readVietnameseWeight(netWeight)}</span>
          </div>

          <div
            className={`text-[11px] sm:text-xs font-semibold mt-1 ${
              sunlightMode ? 'text-slate-600' : 'text-amber-200/80'
            }`}
          >
            (Ký gộp: {formatNumber(grossWeight)} kg &bull; Đã trừ vỏ: -{formatNumber(totalTare)} kg)
          </div>
        </div>

        {/* THẺ 3: TIỀN THỰC LÃNH VỀ TÚI (HOẶC NÔNG DÂN CÒN THIẾU LẠI LÁI) */}
        <div
          className={`w-full rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 md:p-6 shadow-2xl border-2 sm:border-4 transition-colors ${
            isFarmerOwing
              ? (sunlightMode ? 'bg-amber-50 border-amber-600 text-black' : 'bg-gradient-to-r from-amber-950 via-rose-950 to-slate-900 border-amber-500 text-white')
              : (sunlightMode ? 'bg-emerald-50 border-emerald-600 text-black' : 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-teal-950 border-emerald-400 text-white')
          }`}
        >
          <div
            className={`text-[11px] sm:text-xs md:text-sm font-black uppercase tracking-wider mb-1 ${
              isFarmerOwing
                ? (sunlightMode ? 'text-amber-950' : 'text-amber-300')
                : (sunlightMode ? 'text-emerald-950' : 'text-emerald-300')
            }`}
          >
            {isFarmerOwing
              ? '⚠️ THẺ 3: NÔNG DÂN CÒN THIẾU LẠI LÁI'
              : 'THẺ 3: TIỀN THỰC LÃNH VỀ TÚI (TIỀN LÚA SAU TRỪ CỌC)'}
          </div>

          <div
            className={`font-mono text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight my-1 break-words leading-tight ${
              isFarmerOwing
                ? 'text-[#f59e0b]'
                : (sunlightMode ? 'text-emerald-900' : 'text-[#4ADE80] drop-shadow-[0_0_25px_rgba(74,222,128,0.6)]')
            }`}
          >
            {isFarmerOwing ? `-${formatVND(Math.abs(finalPayout))}` : formatVND(finalPayout)}
          </div>

          {/* DÒNG "BẰNG CHỮ" CHO THẺ 3 */}
          <div
            className={`mt-2 pt-2 border-t text-xs sm:text-sm font-bold italic break-words leading-snug ${
              isFarmerOwing
                ? (sunlightMode ? 'border-amber-300 text-amber-950' : 'border-amber-500/40 text-amber-200')
                : (sunlightMode ? 'border-emerald-300 text-emerald-900' : 'border-emerald-500/40 text-emerald-300')
            }`}
          >
            Bằng chữ:{' '}
            <span className={`font-extrabold ${isFarmerOwing ? 'text-amber-400' : 'text-amber-400'}`}>
              {isFarmerOwing
                ? `Chủ ruộng còn thiếu lại thương lái ${readVietnameseMoney(Math.abs(finalPayout)).toLowerCase()}`
                : readVietnameseMoney(finalPayout)}
            </span>
          </div>

          <div
            className={`text-[11px] sm:text-xs font-semibold mt-1 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 ${
              sunlightMode ? 'text-slate-700' : 'text-emerald-200'
            }`}
          >
            <span>Tổng tiền: {formatVND(totalAmount)}</span>
            {batch.depositAmount > 0 && <span>&bull; Đã ứng cọc: -{formatVND(batch.depositAmount)}</span>}
            {totalPorterageFee > 0 && porteragePayer === 'farmer' && (
              <span>&bull; Tiền vác: -{formatVND(totalPorterageFee)}</span>
            )}
          </div>
        </div>
      </div>

      {/* 3. DÒNG CHÂN TRANG ĐỐI CHIẾU */}
      <div
        className={`text-center pt-2 pb-1 text-[11px] sm:text-xs font-mono font-semibold shrink-0 ${
          sunlightMode ? 'text-slate-600' : 'text-slate-500'
        }`}
      >
        Màn hình kiểm đếm bờ ruộng trực tiếp &bull; Cân Lúa Pro
      </div>
    </div>
  );
};
