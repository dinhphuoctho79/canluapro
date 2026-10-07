import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Sun, Moon, User, Wheat, DollarSign, ShieldCheck, History, PlusCircle, Volume2, VolumeX, Settings, Shield, LogIn, Eye } from 'lucide-react';
import { RiceBatch } from '../types';
import { formatNumberWithDots, parseNumberFromDots, readVietnameseMoney } from '../utils/numberToWords';
import { UserProfile } from '../utils/supabaseClient';

interface HeaderInfoProps {
  batch: RiceBatch;
  onUpdateBatch: (updates: Partial<RiceBatch>) => void;
  isOnline: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenHistory: () => void;
  onNewBatch: () => void;
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  onOpenSettings: () => void;
  currentUser?: UserProfile | null;
  onOpenAuth?: () => void;
  onOpenAdmin?: () => void;
  onOpenFarmerDisplay?: () => void;
}

export const POPULAR_RICE_VARIETIES = [
  'Đài Thơm 8',
  'OM 18',
  'ST 25 (Gạo ngon nhất TG)',
  'ST 24',
  'OM 5451',
  'Jasmine 85',
  'IR 50404',
  'Nàng Hoa 9',
  'DS 1 (Lúa Nhật)',
  'OM 380',
];

export const HeaderInfo: React.FC<HeaderInfoProps> = ({
  batch,
  onUpdateBatch,
  isOnline,
  darkMode,
  onToggleDarkMode,
  onOpenHistory,
  onNewBatch,
  isVoiceActive,
  onToggleVoice,
  onOpenSettings,
  currentUser,
  onOpenAuth,
  onOpenAdmin,
  onOpenFarmerDisplay,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  const hasActiveSettings = Boolean(
    batch.brokerName ||
    (batch.brokerFeePerKg || 0) > 0 ||
    (batch.seedDebtAmount || 0) > 0 ||
    (batch.porterPayer ?? batch.porteragePayer) !== 'buyer' ||
    (batch.porterFeePerBag ?? 5000) !== 5000 ||
    batch.vehicleNumber ||
    batch.driverName ||
    batch.destinationMill ||
    (batch.fieldAreaCong || 0) > 0 ||
    batch.harvestDate
  );

  return (
    <header className="relative z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      {/* Top Bar */}
      <div className="px-3 py-2 flex items-center justify-between gap-2 max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          {/* Network indicator */}
          <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold select-none ${
              isOnline
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] font-bold hidden xs:inline">5G Sẵn Sàng</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="text-[11px] font-bold">Offline</span>
              </>
            )}
          </div>

          {/* Real-time Clock */}
          {currentTime && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden sm:inline">
              {currentTime}
            </span>
          )}

          {/* Brand title: CÂN LÚA PRO */}
          <div className="text-left pl-1">
            <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 dark:text-white uppercase flex items-center gap-1.5">
              <span>🌾</span> CÂN LÚA PRO
              <span className="text-[9px] bg-amber-400 text-slate-900 font-black px-1.5 py-0.5 rounded shadow-sm">
                PRO
              </span>
            </h1>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Nút Xem HUD nông dân */}
          {onOpenFarmerDisplay && (
            <button
              onClick={onOpenFarmerDisplay}
              className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-300 dark:border-emerald-800 transition-colors flex items-center gap-1 text-xs font-bold"
              title="Mở màn hình nông dân xem"
            >
              <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden md:inline">HUD Nông Dân</span>
            </button>
          )}

          {/* Nút Admin (chỉ hiện khi user.role === 'admin') */}
          {currentUser?.role === 'admin' && onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="p-1.5 sm:p-2 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 transition-colors flex items-center gap-1 text-xs font-bold animate-pulse"
              title="Quản trị người dùng & mật khẩu"
            >
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600" />
              <span className="hidden md:inline">Quản Trị</span>
            </button>
          )}

          {/* Nút Đăng nhập / Tài khoản */}
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className={`p-1.5 sm:p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 border ${
                currentUser
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700'
                  : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700'
              }`}
              title={currentUser ? `Tài khoản: ${currentUser.full_name} (${currentUser.phone})` : 'Đăng nhập SĐT'}
            >
              {currentUser ? <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" /> : <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span className="hidden xs:inline truncate max-w-[80px] sm:max-w-[100px]">
                {currentUser ? currentUser.full_name.split(' ').pop() : 'Đăng Nhập'}
              </span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="relative p-1.5 sm:p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 text-xs font-bold"
            title="Cài đặt hậu cần & nâng cao"
          >
            <Settings className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden xs:inline">Cài Đặt</span>
            {hasActiveSettings && (
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
            )}
          </button>

          <button
            onClick={onToggleVoice}
            className={`p-2 rounded-lg text-xs font-medium transition-colors ${
              isVoiceActive
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
            }`}
          >
            {isVoiceActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={onToggleDarkMode}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          <button
            onClick={onOpenHistory}
            className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <History className="w-4 h-4" />
          </button>

          <button
            onClick={onNewBatch}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm transition-all whitespace-nowrap"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mẻ Mới</span>
          </button>
        </div>
      </div>

      {/* Compact Core Setup Card (Fixed Spacing & No Overflow) */}
      <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800/80 text-xs max-w-4xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          
          {/* 1. Tên chủ ruộng & SĐT */}
          <div className="col-span-2 md:col-span-1">
            <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mb-0.5 flex items-center gap-1">
              <User className="w-3 h-3 text-emerald-600" />
              1. Chủ ruộng / SĐT:
            </label>
            <div className="grid grid-cols-5 gap-1">
              <input
                type="text"
                placeholder="Tên chủ ruộng"
                value={batch.farmerName}
                onChange={(e) => onUpdateBatch({ farmerName: e.target.value })}
                className="col-span-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-white font-medium text-xs outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                type="tel"
                placeholder="SĐT"
                value={batch.farmerPhone || ''}
                onChange={(e) => onUpdateBatch({ farmerPhone: e.target.value })}
                className="col-span-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-1.5 py-1 text-slate-900 dark:text-white font-medium text-xs outline-none font-mono focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* 2. Giống lúa thu mua */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mb-0.5 flex items-center gap-1">
              <Wheat className="w-3 h-3 text-emerald-600" />
              2. Giống lúa:
            </label>
            <input
              type="text"
              placeholder="VD: Đài Thơm 8"
              value={batch.riceVariety || ''}
              onChange={(e) => onUpdateBatch({ riceVariety: e.target.value })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-white font-medium text-xs outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* 3. Đơn giá chốt */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mb-0.5 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-amber-500" />
              3. Đơn giá (đ/kg):
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatNumberWithDots(batch.pricePerKg)}
              onChange={(e) => onUpdateBatch({ pricePerKg: parseNumberFromDots(e.target.value) })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-white font-bold text-amber-600 dark:text-amber-400 text-xs outline-none font-mono focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* 4. Tiền cọc đã ứng */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-700 dark:text-slate-300 mb-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              4. Tiền cọc đã ứng:
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={formatNumberWithDots(batch.depositAmount)}
              onChange={(e) => onUpdateBatch({ depositAmount: parseNumberFromDots(e.target.value) })}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-900 dark:text-white font-medium text-xs outline-none font-mono focus:ring-1 focus:ring-emerald-500"
            />
          </div>

        </div>

        {/* Tare weight block (Single responsive row) */}
        <div className="mt-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400">Trừ bì:</span>
            {[
              { val: 0, label: '0kg' },
              { val: 0.15, label: '0.15' },
              { val: 0.18, label: '0.18' },
              { val: 0.2, label: '0.20(Ch)' },
              { val: 0.25, label: '0.25' },
            ].map((btn) => (
              <button
                key={btn.val}
                type="button"
                onClick={() => onUpdateBatch({ tareWeightPerBag: btn.val })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                  batch.tareWeightPerBag === btn.val
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {btn.label}
              </button>
            ))}
            <input
              type="text"
              inputMode="decimal"
              value={batch.tareWeightPerBag ?? 0.2}
              onChange={(e) => {
                const val = parseFloat(e.target.value.replace(',', '.'));
                onUpdateBatch({ tareWeightPerBag: isNaN(val) ? 0 : val });
              }}
              className="w-14 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 text-center font-mono font-bold text-[10px] outline-none"
            />
          </div>

          {/* Total tare preview */}
          {(() => {
            const totalBags = batch.lots && batch.lots.length > 0
              ? batch.lots.reduce((acc, l) => acc + l.bags.length, 0)
              : (batch.bags ? batch.bags.length : 0);
            const tarePerBag = batch.tareWeightPerBag ?? 0.2;
            const totalTare = totalBags * tarePerBag;
            return (
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 font-mono">
                📦 Tổng bì: -{totalTare.toFixed(1)}kg ({totalBags} bao)
              </span>
            );
          })()}
        </div>
      </div>
    </header>
  );
};
