import React from 'react';
import { Volume2, Sparkles, Wheat, Zap, Layers } from 'lucide-react';
import { NumpadMode, TensLockValue } from '../types';
import { formatVND } from '../utils/export';

interface WeighingDisplayProps {
  currentInput: string;
  nextBagIndex: number;
  isSpeaking: boolean;
  weighingMode: 'nhon_hoa' | 'bluetooth';
  onToggleWeighingMode: (mode: 'nhon_hoa' | 'bluetooth') => void;
  onSimulateBluetoothWeight?: (weight: number) => void;
  tareWeight: number;
  activeLotName?: string;
  activeLotVariety?: string;
  numpadMode?: NumpadMode;
  tensLock?: TensLockValue;
  bagsPerSheet?: number;
  totalBags: number;
  totalNetWeight: number;
  totalAmount: number;
}

export const WeighingDisplay: React.FC<WeighingDisplayProps> = ({
  currentInput,
  nextBagIndex,
  isSpeaking,
  weighingMode,
  onToggleWeighingMode,
  onSimulateBluetoothWeight,
  tareWeight,
  activeLotName,
  activeLotVariety,
  numpadMode = 'speed_lock',
  tensLock = 50,
  bagsPerSheet = 10,
  totalBags,
  totalNetWeight,
  totalAmount,
}) => {
  const displayValue = currentInput.length > 0 ? currentInput : '0.0';

  const currentSheetNumber = Math.floor((nextBagIndex - 1) / bagsPerSheet) + 1;
  const bagIndexInSheet = ((nextBagIndex - 1) % bagsPerSheet) + 1;

  return (
    <div className="w-full max-w-4xl mx-auto px-3 pt-2 pb-1 space-y-2">
      {/* 3. LED Display Box */}
      <div className="relative rounded-2xl bg-[#020617] border-2 border-slate-800 p-4 shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between mb-1.5 flex-wrap gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800/80">
              BAO SỐ #{nextBagIndex.toString().padStart(2, '0')}
            </span>

            {isSpeaking && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 animate-pulse">
                <Volume2 className="w-3 h-3 text-amber-400" />
                <span>ĐANG ĐỌC GIỌNG NÓI...</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400 flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-400" />
              Tờ {currentSheetNumber}:{' '}
              <strong className="text-emerald-400">
                {bagIndexInSheet}/{bagsPerSheet} bao
              </strong>
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (Trừ vỏ: -{tareWeight}kg)
            </span>
          </div>
        </div>

        {/* Visual Progress Bar for Current Sheet */}
        <div className="relative z-10 w-full bg-slate-800/90 h-1.5 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-amber-400 transition-all duration-300 rounded-full"
            style={{ width: `${Math.max(5, (bagIndexInSheet / bagsPerSheet) * 100)}%` }}
          />
        </div>

        {/* Giant LED Digits for sunlight readability */}
        <div className="relative z-10 flex items-baseline justify-between py-1">
          <div className="flex items-baseline gap-2">
            <span className="font-led text-6xl sm:text-7xl font-extrabold tracking-tight text-[#4ADE80] drop-shadow-[0_0_12px_rgba(74,222,128,0.45)] select-none">
              {displayValue}
            </span>
            <span className="font-mono text-2xl sm:text-3xl font-bold text-emerald-500/80 select-none">
              KG
            </span>
          </div>

          <div className="text-right hidden xs:block">
            <div className="text-[11px] font-mono text-slate-400 uppercase">Ký tịnh ước tính</div>
            <div className="font-led text-xl sm:text-2xl font-bold text-amber-400">
              {Math.max(0, (parseFloat(currentInput) || 0) - tareWeight).toFixed(1)}{' '}
              <span className="text-xs">kg</span>
            </div>
          </div>
        </div>

        {/* Live Realtime Mini Dashboard for Totals */}
        <div className="relative z-10 mt-2 pt-2 border-t border-slate-800/90 grid grid-cols-3 gap-1.5 sm:gap-2">
          {/* Stat 1: Tổng số bao */}
          <div className="bg-slate-900/80 rounded-xl p-2 border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono font-medium tracking-wider">
              Tổng số bao
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-lg sm:text-xl font-black text-white">
                {totalBags}
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-bold">
                bao
              </span>
            </div>
          </div>

          {/* Stat 2: Tổng ký tịnh */}
          <div className="bg-slate-900/80 rounded-xl p-2 border border-slate-800 flex flex-col justify-center">
            <span className="text-[10px] text-emerald-400/90 uppercase font-mono font-medium tracking-wider">
              Tổng ký tịnh
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="font-mono text-lg sm:text-xl font-black text-emerald-400">
                {totalNetWeight.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                kg
              </span>
            </div>
          </div>

          {/* Stat 3: Thành tiền tạm tính */}
          <div className="bg-amber-950/40 rounded-xl p-2 border border-amber-900/50 flex flex-col justify-center">
            <span className="text-[10px] text-amber-400 uppercase font-mono font-medium tracking-wider">
              Thành tiền
            </span>
            <div className="flex items-baseline gap-1 mt-0.5 truncate">
              <span className="font-mono text-base sm:text-lg font-black text-amber-300 truncate">
                {formatVND(totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {weighingMode === 'bluetooth' && (
          <div className="relative z-10 mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1 text-[11px]">
              <Sparkles className="w-3 h-3 text-blue-400" />
              Mô phỏng cân gửi số:
            </span>
            <div className="flex gap-1.5">
              {[49.8, 50.2, 51.4, 52.0].map((testWeight) => (
                <button
                  key={testWeight}
                  type="button"
                  onClick={() => onSimulateBluetoothWeight && onSimulateBluetoothWeight(testWeight)}
                  className="px-2 py-1 bg-blue-950 text-blue-300 hover:bg-blue-900 rounded font-mono text-xs border border-blue-800 transition-colors"
                >
                  +{testWeight}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
