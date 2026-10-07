import React from 'react';
import { X, Users, Truck, Sprout, Settings, Volume2, ShieldCheck, DollarSign } from 'lucide-react';
import { RiceBatch } from '../types';
import { formatNumberWithDots, parseNumberFromDots, readVietnameseMoney } from '../utils/numberToWords';

interface SettingsModalProps {
  batch: RiceBatch;
  onUpdateBatch: (updates: Partial<RiceBatch>) => void;
  isOpen: boolean;
  onClose: () => void;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  batch,
  onUpdateBatch,
  isOpen,
  onClose,
  isVoiceActive,
  onToggleVoice,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full max-h-[90vh] bg-white dark:bg-slate-900 rounded-3xl p-3.5 sm:p-5 shadow-2xl relative flex flex-col border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Settings className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white uppercase">
                Cài Đặt Kèo Lúa & Hậu Cần
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Cấu hình cò lúa, bốc vác, nợ giống và hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain my-2.5 space-y-3 pr-1 text-xs">
          {/* GROUP 1: Hậu cần (Cò lúa & Bốc vác & Vận chuyển) */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white uppercase flex items-center gap-1.5 text-xs sm:text-sm border-b pb-2 border-slate-200 dark:border-slate-700">
              <Users className="w-4 h-4 text-amber-500" />
              1. Nghiệp Vụ Hậu Cần (Cò, Vác, Xe/Ghe)
            </h3>

            {/* Cò lúa */}
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                🤝 Thông tin Cò lúa (Môi giới dắt mối):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Tên cò lúa"
                  value={batch.brokerName || ''}
                  onChange={(e) => onUpdateBatch({ brokerName: e.target.value })}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="tel"
                  placeholder="SĐT cò lúa"
                  value={batch.brokerPhone || ''}
                  onChange={(e) => onUpdateBatch({ brokerPhone: e.target.value })}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatNumberWithDots(batch.brokerFeePerKg || 0)}
                    onChange={(e) => {
                      const val = parseNumberFromDots(e.target.value);
                      onUpdateBatch({ brokerFeePerKg: val, brokerFeePerCong: val });
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 pr-12 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white font-mono font-bold text-amber-600 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 text-xs text-slate-400 font-medium pointer-events-none">đ/kg</span>
                </div>
              </div>
            </div>

            {/* Bốc vác */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                📦 Đội Thợ Bốc Vác & Kéo Lúa:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative flex items-center">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="5000"
                    value={formatNumberWithDots(batch.porterFeePerBag ?? 5000)}
                    onChange={(e) => {
                      const val = parseNumberFromDots(e.target.value);
                      onUpdateBatch({ porterFeePerBag: val, porterageFeePerBag: val });
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 pr-12 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white font-mono font-bold text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 text-xs text-slate-400 font-medium pointer-events-none">đ/bao</span>
                </div>

                {/* Ai trả tiền bốc vác */}
                <div className="flex rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-1 min-h-[42px] items-center">
                  <button
                    type="button"
                    onClick={() => onUpdateBatch({ porterPayer: 'farmer', porteragePayer: 'farmer' })}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] sm:text-xs transition-all ${
                      (batch.porterPayer ?? batch.porteragePayer) === 'farmer'
                        ? 'bg-rose-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Dân chịu
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateBatch({ porterPayer: 'buyer', porteragePayer: 'buyer' })}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] sm:text-xs transition-all ${
                      (batch.porterPayer ?? batch.porteragePayer ?? 'buyer') === 'buyer'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Lái trả
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateBatch({ porterPayer: 'split', porteragePayer: 'split' })}
                    className={`flex-1 py-1.5 rounded-lg font-bold text-[11px] sm:text-xs transition-all ${
                      (batch.porterPayer ?? batch.porteragePayer) === 'split'
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Chia đôi
                  </button>
                </div>
              </div>
            </div>

            {/* Vận chuyển */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700/60">
              <label className="font-bold text-slate-700 dark:text-slate-300 block">
                🚢 Phương Tiện Vận Chuyển & Lò Sấy:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select
                  value={batch.transportType || 'boat'}
                  onChange={(e) => onUpdateBatch({ transportType: e.target.value as 'boat' | 'truck' })}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white font-semibold outline-none"
                >
                  <option value="boat">Ghe / Sà lan</option>
                  <option value="truck">Xe tải</option>
                </select>
                <input
                  type="text"
                  placeholder={batch.transportType === 'truck' ? 'Biển số xe (65C-123.45)' : 'Số hiệu ghe (CT-999)'}
                  value={batch.vehicleNumber || ''}
                  onChange={(e) => onUpdateBatch({ vehicleNumber: e.target.value })}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white font-mono uppercase outline-none"
                />
                <input
                  type="text"
                  placeholder={batch.transportType === 'truck' ? 'Tên tài xế' : 'Tên tài công'}
                  value={batch.driverName || ''}
                  onChange={(e) => onUpdateBatch({ driverName: e.target.value })}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white outline-none"
                />
                <input
                  type="text"
                  placeholder="Lò sấy / Nhà máy đến"
                  value={batch.destinationMill || ''}
                  onChange={(e) => onUpdateBatch({ destinationMill: e.target.value })}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>
          </div>

          {/* GROUP 2: Ruộng & Cấn trừ nợ giống */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white uppercase flex items-center gap-1.5 text-xs sm:text-sm border-b pb-2 border-slate-200 dark:border-slate-700">
              <Sprout className="w-4 h-4 text-emerald-500" />
              2. Ruộng Lúa & Cấn Trừ Nợ Giống / Vật Tư
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Diện tích (Số công):
                </label>
                <input
                  type="number"
                  placeholder="VD: 50 công"
                  value={batch.fieldAreaCong || ''}
                  onChange={(e) => onUpdateBatch({ fieldAreaCong: Number(e.target.value) || 0 })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Ngày định cắt:
                </label>
                <input
                  type="date"
                  value={batch.harvestDate || ''}
                  onChange={(e) => onUpdateBatch({ harvestDate: e.target.value })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white font-medium outline-none"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-rose-500" />
                  Nợ giống / Vật tư cấn trừ (VNĐ):
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatNumberWithDots(batch.seedDebtAmount || 0)}
                  onChange={(e) => onUpdateBatch({ seedDebtAmount: parseNumberFromDots(e.target.value) })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white font-mono font-bold text-rose-600 outline-none"
                />
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 italic">
                  👉 Sẽ trừ thẳng vào số tiền trả nông dân
                </div>
              </div>
            </div>
          </div>

          {/* GROUP 3: Hệ thống (Quy cách tờ, Loa giọng đọc) */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="font-extrabold text-slate-900 dark:text-white uppercase flex items-center gap-1.5 text-xs sm:text-sm border-b pb-2 border-slate-200 dark:border-slate-700">
              <ShieldCheck className="w-4 h-4 text-blue-500" />
              3. Tùy Chọn Hệ Thống (In ấn & Giọng đọc)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Quy cách dòng / tờ cân:
                </label>
                <select
                  value={batch.bagsPerSheet}
                  onChange={(e) => onUpdateBatch({ bagsPerSheet: Number(e.target.value) })}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[42px] text-sm sm:text-base text-slate-900 dark:text-white font-semibold outline-none"
                >
                  <option value={10}>10 bao / tờ (Tiêu chuẩn)</option>
                  <option value={20}>20 bao / tờ</option>
                  <option value={50}>50 bao / tờ</option>
                </select>
              </div>

              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 min-h-[42px]">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                    Đọc số kg qua loa giọng nói
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onToggleVoice}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    isVoiceActive
                      ? 'bg-emerald-600 text-white shadow'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isVoiceActive ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                </button>
              </div>
            </div>
          </div>

          {/* AUTHOR & TECHNICAL SUPPORT SECTION */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-1.5">
            <div className="font-extrabold text-emerald-800 dark:text-emerald-300 text-xs">
              🌾 CÂN LÚA PRO • PHẦN MỀM THU MUA LÚA GẠO BỜ RUỘNG CHUYÊN NGHIỆP
            </div>
            <div className="text-slate-700 dark:text-slate-300 font-medium text-xs">
              Tác giả: <strong className="text-slate-900 dark:text-white">Nguyễn Công Dinh</strong> (Cần Thơ)
            </div>
            <div>
              <a
                href="https://zalo.me/0393990638"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-bold hover:underline bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-blue-200 dark:border-blue-800 shadow-sm text-xs"
              >
                <span>💬</span> Zalo Hỗ Trợ Kỹ Thuật: 039.399.0638 (Bấm để chat)
              </a>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full min-h-[48px] py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-extrabold text-sm sm:text-base shadow-lg transition-all active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>LƯU & ÁP DỤNG CÀI ĐẶT</span>
          </button>
        </div>
      </div>
    </div>
  );
};

