import React, { useState } from 'react';
import { CloudUpload, Share2, QrCode, Eye, Truck, ChevronDown, ChevronUp, Layers, HelpCircle, FileSpreadsheet } from 'lucide-react';
import { RiceBatch, RiceLot } from '../types';
import { formatVND, formatNumber } from '../utils/export';
import { exportRiceBatchToExcel } from '../utils/excelExport';
import { readVietnameseMoney, readVietnameseWeight, formatNumberWithDots, parseNumberFromDots } from '../utils/numberToWords';

interface FinancialSummaryProps {
  batch: RiceBatch;
  onUpdateBatch?: (updates: Partial<RiceBatch>) => void;
  onOpenSyncSheets: () => void;
  onOpenZaloExport: () => void;
  onOpenVietQR: () => void;
  onOpenFarmerDisplay: () => void;
}

export const FinancialSummary: React.FC<FinancialSummaryProps> = ({
  batch,
  onUpdateBatch,
  onOpenSyncSheets,
  onOpenZaloExport,
  onOpenVietQR,
  onOpenFarmerDisplay,
}) => {
  const [showPorterageSettings, setShowPorterageSettings] = useState<boolean>(false);

  const handleExportExcel = () => {
    try {
      const stored = localStorage.getItem('canlua_mientay_batches_v2');
      const allB = stored ? JSON.parse(stored) : [batch];
      exportRiceBatchToExcel(batch, allB);
    } catch {
      exportRiceBatchToExcel(batch, [batch]);
    }
  };

  // Normalize lots: if multiple lots exist, use them, otherwise use single default lot from batch
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

  // Calculate per-lot metrics & grand totals
  let grandTotalBags = 0;
  let grandGrossWeight = 0;
  let calculatedBagTare = 0;

  const initialLotsSummary = lots.map((lot) => {
    const bagCount = lot.bags.length;
    const gross = lot.bags.reduce((acc, b) => acc + b.weight, 0);
    const tarePerBag = typeof lot.tareWeightPerBag === 'number' && lot.tareWeightPerBag >= 0
      ? lot.tareWeightPerBag
      : (typeof batch.tareWeightPerBag === 'number' ? batch.tareWeightPerBag : 0.2);
    const tare = bagCount * tarePerBag;

    grandTotalBags += bagCount;
    grandGrossWeight += gross;
    calculatedBagTare += tare;

    return {
      lot,
      bagCount,
      gross,
      tare,
    };
  });

  const flatTare = batch.flatTareAmount || 0;
  const grandTotalTare = flatTare > 0 ? flatTare : calculatedBagTare;
  const grandNetWeight = Math.max(0, grandGrossWeight - grandTotalTare);

  let grandTotalAmount = 0;
  const lotsSummary = initialLotsSummary.map((item) => {
    const lotShare = grandGrossWeight > 0 ? item.gross / grandGrossWeight : (initialLotsSummary.length === 1 ? 1 : 1 / initialLotsSummary.length);
    const lotTare = flatTare > 0 ? flatTare * lotShare : item.tare;
    const net = Math.max(0, item.gross - lotTare);
    const effectivePrice = (typeof item.lot.pricePerKg === 'number' && item.lot.pricePerKg > 0)
      ? item.lot.pricePerKg
      : (batch.pricePerKg || 0);
    const amount = Math.round(net * effectivePrice);

    grandTotalAmount += amount;

    return {
      ...item,
      tare: lotTare,
      net,
      amount,
    };
  });

  // Porterage & Broker calculations
  const porterFeePerBag = batch.porterFeePerBag ?? batch.porterageFeePerBag ?? 5000;
  const porterPayer = batch.porterPayer ?? batch.porteragePayer ?? 'buyer';
  const totalPorterageFee = grandTotalBags * porterFeePerBag;

  const brokerFeePerKg = batch.brokerFeePerKg || 0;
  const totalBrokerFee = grandNetWeight * brokerFeePerKg;

  // Final payout calculation - KHÔNG dùng Math.max(0, finalPayout) để tránh nuốt số âm khi cọc lớn hơn tiền lúa
  let finalPayout = grandTotalAmount - (batch.depositAmount || 0);
  if (porterPayer === 'farmer') {
    finalPayout -= totalPorterageFee;
  } else if (porterPayer === 'split') {
    finalPayout -= totalPorterageFee / 2;
  }
  const isFarmerOwing = finalPayout < 0;

  let buyerPorterShare = 0;
  if (porterPayer === 'buyer') buyerPorterShare = totalPorterageFee;
  else if (porterPayer === 'split') buyerPorterShare = totalPorterageFee / 2;

  const totalTraderOutflow = grandTotalAmount + buyerPorterShare + totalBrokerFee;
  const realCostPerKg = grandNetWeight > 0 ? totalTraderOutflow / grandNetWeight : batch.pricePerKg;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 py-3 space-y-3">
      {/* FINANCIAL SUMMARY CARD */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white p-4 sm:p-5 border-2 border-slate-800 shadow-xl">
        {/* Top title bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <h2 className="text-sm font-black tracking-wider uppercase text-slate-200">
              TỔNG KẾT TÀI CHÍNH MẺ CÂN
            </h2>
            {lots.length > 1 && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                Gộp {lots.length} giống lúa
              </span>
            )}
          </div>

          {/* Quick Farmer Companion View button */}
          <button
            onClick={onOpenFarmerDisplay}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/80 text-emerald-300 text-xs font-bold transition-colors"
            title="Mở màn hình lớn cho nông dân xem trực tiếp"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Màn hình Nông Dân</span>
          </button>
        </div>

        {/* MULTI-LOT BREAKDOWN (If more than 1 variety is weighed in this batch) */}
        {lots.length > 1 && (
          <div className="mb-4 space-y-2 bg-slate-800/40 p-3 rounded-xl border border-slate-700/80">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Layers className="w-3.5 h-3.5" />
              <span>CHI TIẾT TỪNG LÔ LÚA CON (SUB-LOTS):</span>
            </div>

            <div className="space-y-1.5">
              {lotsSummary.map((item, idx) => (
                <div
                  key={item.lot.id}
                  className="bg-slate-900/90 p-2.5 rounded-lg border border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-900 text-emerald-300 flex items-center justify-center font-mono text-[11px] font-extrabold">
                        {idx + 1}
                      </span>
                      <span>{item.lot.lotName || `Lô ${idx + 1}`}</span>
                      <span className="text-slate-400">({item.lot.riceVariety})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Đơn giá: <strong className="text-slate-300">{formatVND(item.lot.pricePerKg)}/kg</strong> · Trừ bao: {item.lot.tareWeightPerBag}kg/bao
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-xs text-slate-300">
                      <strong>{item.bagCount} bao</strong> | Ký tịnh: {formatNumber(item.net)} kg
                    </div>
                    <div className="font-mono-num font-extrabold text-sm text-emerald-400">
                      {formatVND(item.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2-Column metric grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 text-xs">
          {/* Col 1: Tổng số bao */}
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block mb-0.5">Tổng số bao:</span>
            <span className="font-mono-num text-xl sm:text-2xl font-extrabold text-white">
              {grandTotalBags} <span className="text-xs font-normal text-slate-400">bao</span>
            </span>
          </div>

          {/* Col 2: Tổng ký gộp */}
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block mb-0.5">Tổng ký gộp:</span>
            <span className="font-mono-num text-xl sm:text-2xl font-extrabold text-white">
              {formatNumber(grandGrossWeight)} <span className="text-xs font-normal text-slate-400">kg</span>
            </span>
          </div>

          {/* Col 3: Trừ bao bì */}
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-slate-400 block mb-0.5">Tổng trừ vỏ bao:</span>
            <span className="font-mono-num text-xl sm:text-2xl font-extrabold text-rose-400">
              -{formatNumber(grandTotalTare)} <span className="text-xs font-normal text-slate-400">kg</span>
            </span>
          </div>

          {/* Col 4: Ký tịnh thanh toán */}
          <div className="bg-amber-950/40 p-2.5 rounded-xl border border-amber-600/50 col-span-2 sm:col-span-1">
            <span className="text-[11px] text-amber-300 font-bold block mb-0.5">KÝ TỊNH THANH TOÁN:</span>
            <span className="font-mono-num text-2xl font-black text-amber-400">
              {formatNumber(grandNetWeight)} <span className="text-xs font-bold text-amber-300">kg</span>
            </span>
            <div className="mt-1.5 pt-1.5 border-t border-amber-500/30 text-[11px] font-semibold text-amber-200">
              ⚖️ Ký tịnh bằng chữ: <span className="font-bold text-yellow-300">{readVietnameseWeight(grandNetWeight)}</span>
            </div>
          </div>

          {/* Col 5: Tổng thành tiền */}
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block mb-0.5">Tổng thành tiền lúa:</span>
            <span className="font-mono-num text-lg sm:text-xl font-bold text-slate-200">
              {formatVND(grandTotalAmount)}
            </span>
          </div>

          {/* Col 6: Cấn trừ tiền cọc */}
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60">
            <span className="text-[11px] text-slate-400 block mb-0.5">Cấn trừ tiền cọc:</span>
            <span className="font-mono-num text-lg sm:text-xl font-bold text-rose-400">
              -{formatVND(batch.depositAmount || 0)}
            </span>
          </div>
        </div>

        {/* TIỀN CÔNG BỐC VÁC & KÉO LÚA TẠI RUỘNG BAR */}
        <div className="mb-4 bg-slate-800/70 rounded-xl p-3 border border-slate-700">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-200">
                Tiền công bốc vác & kéo lúa:
              </span>
              <span className="font-mono text-slate-300">
                {porterFeePerBag > 0
                  ? `Công bốc vác (${formatNumberWithDots(porterFeePerBag)} đ x ${grandTotalBags} bao): ${formatVND(totalPorterageFee)}`
                  : 'Chưa tính (0 đ/bao)'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowPorterageSettings(!showPorterageSettings)}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 text-[11px]"
            >
              <span>{showPorterageSettings ? 'Thu gọn' : 'Đổi người chịu & giá'}</span>
              {showPorterageSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Dropdown form to adjust porterage */}
          {showPorterageSettings && onUpdateBatch && (
            <div className="mt-3 pt-3 border-t border-slate-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in slide-in-from-top-1">
              <div>
                <label className="block text-[11px] text-slate-300 font-bold mb-1">
                  Đơn giá bốc vác (đ/bao):
                </label>
                <div className="flex gap-1.5 items-center">
                  {[0, 4000, 5000, 6000].map((fee) => (
                    <button
                      key={fee}
                      type="button"
                      onClick={() => onUpdateBatch({ porterFeePerBag: fee, porterageFeePerBag: fee })}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition-all ${
                        porterFeePerBag === fee
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {fee === 0 ? '0 đ' : `${fee / 1000}k`}
                    </button>
                  ))}
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={formatNumberWithDots(porterFeePerBag)}
                      onChange={(e) => {
                        const val = parseNumberFromDots(e.target.value);
                        onUpdateBatch({
                          porterFeePerBag: val,
                          porterageFeePerBag: val,
                        });
                      }}
                      className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 pr-9 font-mono text-white text-xs outline-none"
                    />
                    <span className="absolute right-2 text-[10px] text-slate-400 font-medium pointer-events-none">đ/bao</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-bold mb-1">
                  Ai chịu tiền bốc vác?
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateBatch({ porterPayer: 'farmer', porteragePayer: 'farmer' })}
                    className={`py-1 px-1.5 rounded text-[11px] font-bold transition-all ${
                      porterPayer === 'farmer' ? 'bg-rose-700 text-white shadow-sm' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    Dân chịu
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateBatch({ porterPayer: 'buyer', porteragePayer: 'buyer' })}
                    className={`py-1 px-1.5 rounded text-[11px] font-bold transition-all ${
                      porterPayer === 'buyer' ? 'bg-blue-700 text-white shadow-sm' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    Lái trả
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateBatch({ porterPayer: 'split', porteragePayer: 'split' })}
                    className={`py-1 px-1.5 rounded text-[11px] font-bold transition-all ${
                      porterPayer === 'split' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    Chia đôi
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Porterage summary line */}
          {totalPorterageFee > 0 && (
            <div className="mt-2 text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              {porterPayer === 'farmer' ? (
                <span className="text-rose-400 font-bold">
                  &bull; Trừ tiền bốc vác vào tiền lúa của nông dân: -{formatVND(totalPorterageFee)}
                </span>
              ) : porterPayer === 'split' ? (
                <span className="text-amber-400 font-bold">
                  &bull; Chia đôi tiền vác (Nông dân chịu -{formatVND(totalPorterageFee / 2)} | Lái chịu -{formatVND(totalPorterageFee / 2)})
                </span>
              ) : (
                <span className="text-blue-300 font-bold">
                  &bull; Thương lái chi riêng cho đội vác: {formatVND(totalPorterageFee)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* GIÁ VỐN THỰC TẾ CHO THƯƠNG LÁI (REAL COST FOR TRADER) */}
        <div className="bg-slate-800/90 rounded-xl p-3 border border-emerald-500/50 space-y-1 text-xs mb-2 shadow-md">
          <div className="flex items-center justify-between text-emerald-300 font-bold">
            <span>📊 GIÁ VỐN THỰC TẾ VỀ TỚI LÒ (CHO LÁI):</span>
            <span className="font-mono-num text-base font-black text-amber-400">
              {formatNumber(realCostPerKg, 0)} đ / kg
            </span>
          </div>
          <div className="text-[11px] text-slate-400 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>• Tiền lúa: {formatVND(grandTotalAmount)}</span>
            {totalBrokerFee > 0 && <span>• Tiền cò ({batch.brokerName || 'Cò'}): {formatVND(totalBrokerFee)}</span>}
            {buyerPorterShare > 0 && <span>• Vác lái chịu: {formatVND(buyerPorterShare)}</span>}
            {batch.vehicleNumber && <span>• Vận chuyển: {batch.transportType === 'truck' ? 'Xe tải' : 'Ghe'} ({batch.vehicleNumber})</span>}
          </div>
        </div>

        {/* BIG PAYOUT HIGHLIGHT: TIỀN CÒN LẠI TRẢ NÔNG DÂN / NÔNG DÂN CÒN THIẾU LẠI LÁI */}
        <div
          className={`p-3.5 sm:p-4 rounded-xl border-2 shadow-lg flex flex-col gap-2 transition-colors ${
            isFarmerOwing
              ? 'bg-gradient-to-r from-amber-950 via-rose-950 to-slate-900 border-amber-500/90'
              : 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 border-emerald-500/80'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <span
                className={`text-[11px] font-bold uppercase tracking-wider block ${
                  isFarmerOwing ? 'text-amber-400' : 'text-emerald-300'
                }`}
              >
                {isFarmerOwing ? '⚠️ NÔNG DÂN CÒN THIẾU LẠI LÁI' : 'TIỀN CÒN LẠI TRẢ NÔNG DÂN'}
              </span>
              <span className="text-xs text-slate-300">
                ({batch.farmerName || 'Chủ ruộng'} · {grandTotalBags} bao lúa
                {porterPayer === 'farmer' && totalPorterageFee > 0 ? ' · Đã trừ tiền vác' : porterPayer === 'split' && totalPorterageFee > 0 ? ' · Đã trừ 1/2 tiền vác' : ''})
              </span>
            </div>

            <div className="text-left sm:text-right">
              <span
                className={`font-mono-num text-3xl sm:text-4xl font-black block drop-shadow-md ${
                  isFarmerOwing ? 'text-[#f59e0b]' : 'text-[#10b981]'
                }`}
              >
                {isFarmerOwing ? `-${formatVND(Math.abs(finalPayout))}` : formatVND(finalPayout)}
              </span>
            </div>
          </div>

          <div
            className={`mt-1 pt-1 border-t text-xs font-semibold italic ${
              isFarmerOwing ? 'border-amber-500/40 text-amber-200' : 'border-emerald-500/30 text-emerald-200'
            }`}
          >
            Bằng chữ:{' '}
            <span className={`font-bold ${isFarmerOwing ? 'text-amber-300' : 'text-yellow-300'}`}>
              {isFarmerOwing
                ? `Chủ ruộng còn thiếu lại thương lái ${readVietnameseMoney(Math.abs(finalPayout)).toLowerCase()}`
                : readVietnameseMoney(finalPayout)}
            </span>
          </div>
        </div>
      </div>

      {/* 3 MAIN ACTION BUTTONS */}
      <div className="space-y-2">
        {/* BUTTON 1: Full-width Google Sheets / Excel Sync */}
        <button
          type="button"
          onClick={onOpenSyncSheets}
          className="w-full min-h-[52px] py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.99] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-md transition-all border border-slate-700"
        >
          <CloudUpload className="w-5 h-5 text-emerald-400" />
          <span>LƯU & ĐỒNG BỘ VỀ GOOGLE SHEETS / EXCEL</span>
        </button>

        {/* BUTTONS 2 & 3: 2-Column Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* BUTTON 2: Zalo Share & Thermal Printing */}
          <button
            type="button"
            onClick={onOpenZaloExport}
            className="w-full min-h-[50px] py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span>XUẤT ẢNH / IN NHIỆT / GỬI ZALO</span>
          </button>

          {/* BUTTON 3: VietQR Payment Code */}
          <button
            type="button"
            onClick={onOpenVietQR}
            className="w-full min-h-[50px] py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all"
          >
            <QrCode className="w-4 h-4" />
            <span>TẠO MÃ VIETQR CHUYỂN KHOẢN TỰ ĐỘNG</span>
          </button>
        </div>

        {/* BUTTON 4: Xuất File Excel (.xlsx) */}
        <button
          type="button"
          onClick={handleExportExcel}
          className="w-full min-h-[50px] py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all"
        >
          <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
          <span>Xuất File Excel (.xlsx)</span>
        </button>
      </div>
    </div>
  );
};
