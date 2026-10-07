import React, { useEffect, useCallback, useRef } from 'react';
import { Delete, CornerDownLeft, Plus, Zap, Lock, Scale } from 'lucide-react';
import { NumpadMode, TensLockValue } from '../types';
import { audioManager } from '../utils/audio';

interface ErgonomicNumpadProps {
  numpadMode: NumpadMode;
  onToggleNumpadMode: (mode: NumpadMode) => void;
  tensLock: TensLockValue;
  onSelectTensLock: (val: TensLockValue) => void;
  autoCommit: boolean;
  onToggleAutoCommit: (enabled: boolean) => void;
  currentInput: string;
  speedRawDigits: string;
  onDigit: (digit: string) => void;
  onDecimal: () => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  onAddTareShortcut: (amount: number) => void; // +0.2 increment
  onSpeedDigit: (digit: string) => void;
  onSpeedBackspace: () => void;
  onInstantOneTouchWeight: (weight: number) => void; // 1-Touch instant save for Nhơn Hòa dial marks
}

export function calculateSpeedWeight(digits: string, baseTens: TensLockValue): number | null {
  if (!digits || digits.length === 0) return null;

  // Single digit: e.g. "4" -> 50.4 (baseTens + 0.4)
  if (digits.length === 1) {
    const d = parseInt(digits, 10);
    return Math.round((baseTens + d / 10) * 10) / 10;
  }

  // 2 digits: e.g. "14" -> 51.4, "98" -> 49.8, "06" -> 50.6
  if (digits.length >= 2) {
    const d1 = parseInt(digits[0], 10);
    const d2 = parseInt(digits[1], 10);

    // If first digit is 8 or 9 when baseTens is 50, represents 48.x or 49.x
    if (baseTens === 50 && (d1 === 8 || d1 === 9)) {
      const whole = 40 + d1;
      return Math.round((whole + d2 / 10) * 10) / 10;
    }

    if (baseTens === 60 && (d1 === 8 || d1 === 9)) {
      const whole = 50 + d1;
      return Math.round((whole + d2 / 10) * 10) / 10;
    }

    if (baseTens === 40 && (d1 === 8 || d1 === 9)) {
      const whole = 30 + d1;
      return Math.round((whole + d2 / 10) * 10) / 10;
    }

    const whole = baseTens + d1;
    return Math.round((whole + d2 / 10) * 10) / 10;
  }

  return null;
}

export const ErgonomicNumpad: React.FC<ErgonomicNumpadProps> = ({
  numpadMode,
  onToggleNumpadMode,
  tensLock,
  onSelectTensLock,
  autoCommit,
  onToggleAutoCommit,
  currentInput,
  speedRawDigits,
  onDigit,
  onDecimal,
  onBackspace,
  onSubmit,
  onAddTareShortcut,
  onSpeedDigit,
  onSpeedBackspace,
  onInstantOneTouchWeight,
}) => {
  const autoCommitTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handlePress = useCallback(
    (action: () => void) => {
      audioManager.triggerHaptic(20);
      audioManager.playKeyClick();
      action();
    },
    []
  );

  // Auto-commit timer effect for Speed Mode (Exact 0.35s debounce as requested)
  useEffect(() => {
    if (numpadMode !== 'speed_lock' || !autoCommit) {
      if (autoCommitTimerRef.current) clearTimeout(autoCommitTimerRef.current);
      return;
    }

    if (speedRawDigits.length > 0) {
      if (autoCommitTimerRef.current) clearTimeout(autoCommitTimerRef.current);

      // Auto commit after exactly 350ms (0.35s)
      autoCommitTimerRef.current = setTimeout(() => {
        onSubmit();
      }, 350);
    }

    return () => {
      if (autoCommitTimerRef.current) clearTimeout(autoCommitTimerRef.current);
    };
  }, [speedRawDigits, numpadMode, autoCommit, onSubmit]);

  // Handle instant 1-touch for Nhơn Hòa dial marks (+0.2, +0.4, +0.5, +0.6, +0.8)
  const handleInstantDialMark = (offset: number) => {
    handlePress(() => {
      const targetWeight = Math.round((tensLock + offset) * 10) / 10;
      onInstantOneTouchWeight(targetWeight);
    });
  };

  const handleManualSubmit = useCallback(() => {
    if (autoCommitTimerRef.current) {
      clearTimeout(autoCommitTimerRef.current);
      autoCommitTimerRef.current = null;
    }
    onSubmit();
  }, [onSubmit]);

  // Physical keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        if (numpadMode === 'speed_lock') {
          handlePress(() => onSpeedDigit(e.key));
        } else {
          handlePress(() => onDigit(e.key));
        }
      } else if (e.key === '.' || e.key === ',') {
        e.preventDefault();
        if (numpadMode === 'full') {
          handlePress(onDecimal);
        }
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (numpadMode === 'speed_lock') {
          handlePress(onSpeedBackspace);
        } else {
          handlePress(onBackspace);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handlePress(handleManualSubmit);
      } else if (e.key === '+') {
        e.preventDefault();
        handleInstantDialMark(0.2);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handlePress,
    numpadMode,
    onDigit,
    onDecimal,
    onBackspace,
    handleManualSubmit,
    onSpeedDigit,
    onSpeedBackspace,
    tensLock,
  ]);

  return (
    <div className="w-full max-w-4xl mx-auto px-3 py-1 select-none space-y-2">
      {/* 1. THANH CHỌN MỐC HÀNG CHỤC NHANH (BASE TENS BAR) & CÔNG TẮC GÕ TẮT 1 CHẠM */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Công tắc BẬT/TẮT Gõ Tắt 1 Chạm */}
        <div className="flex items-center justify-between gap-2 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              const newMode: NumpadMode = numpadMode === 'speed_lock' ? 'full' : 'speed_lock';
              onToggleNumpadMode(newMode);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              numpadMode === 'speed_lock'
                ? 'bg-amber-500 text-slate-950 shadow-md scale-[1.02]'
                : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${numpadMode === 'speed_lock' ? 'fill-slate-950 text-slate-950' : 'text-slate-400'}`} />
            <span>⚡ Gõ Tắt 1 Chạm: {numpadMode === 'speed_lock' ? 'BẬT' : 'TẮT'}</span>
          </button>

          {/* Auto-commit badge indicator */}
          {numpadMode === 'speed_lock' && (
            <span className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 shrink-0">
              Tự lưu: 0.35s
            </span>
          )}
        </div>

        {/* Thanh 3 nút Mốc Hàng Chục: [ 40kg ] [ 50kg (Mặc định) ] [ 60kg ] */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 pl-1.5 pr-0.5 flex items-center gap-1 shrink-0">
            <Lock className="w-3 h-3 text-emerald-600" />
            Mốc:
          </span>

          {([40, 50, 60] as TensLockValue[]).map((val) => {
            const isSelected = tensLock === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => onSelectTensLock(val)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-black font-mono transition-all border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md scale-105'
                    : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-200'
                }`}
              >
                {val}kg {val === 50 && <span className="text-[9px] font-normal opacity-90">(Chuẩn)</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. HÀNG PHÍM VẠCH LẺ NHƠN HÒA SIÊU TO (1 CHẠM TỰ LƯU NGAY LẬP TỨC) */}
      <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border-2 border-emerald-500/40 rounded-2xl p-2 shadow-sm">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            VẠCH LẺ NHƠN HÒA (1 CHẠM TỰ LƯU NGAY MỐC {tensLock}KG):
          </span>
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold">
            ⚡ Bấm là chốt bao
          </span>
        </div>

        {/* 5 Big Buttons: [+0.2] [+0.4] [+0.5] [+0.6] [+0.8] */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {[0.2, 0.4, 0.5, 0.6, 0.8].map((offset) => {
            const calculatedKg = Math.round((tensLock + offset) * 10) / 10;
            return (
              <button
                key={offset}
                type="button"
                onClick={() => handleInstantDialMark(offset)}
                className="min-h-[54px] rounded-xl bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 active:bg-emerald-600 active:text-white border-2 border-emerald-400 dark:border-emerald-700 active:scale-[0.96] transition-all flex flex-col items-center justify-center shadow-sm text-slate-900 dark:text-white group"
                title={`Lưu ngay bao ${calculatedKg}kg`}
              >
                <span className="font-mono text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400 group-active:text-white">
                  +{offset}
                </span>
                <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 group-active:text-white leading-tight">
                  {calculatedKg}kg
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. BÀN PHÍM NUMPAD 4x4 CÔNG THÁI HỌC (TOUCH TARGET >= 64px) */}
      <div className="grid grid-cols-4 gap-2">
        {/* ROW 1 */}
        <button
          type="button"
          onClick={() =>
            handlePress(() => (numpadMode === 'speed_lock' ? onSpeedDigit('7') : onDigit('7')))
          }
          className="min-h-[64px] rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700 active:scale-[0.97] transition-all flex items-center justify-center text-3xl font-extrabold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          7
        </button>
        <button
          type="button"
          onClick={() =>
            handlePress(() => (numpadMode === 'speed_lock' ? onSpeedDigit('8') : onDigit('8')))
          }
          className="min-h-[64px] rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700 active:scale-[0.97] transition-all flex items-center justify-center text-3xl font-extrabold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          8
        </button>
        <button
          type="button"
          onClick={() =>
            handlePress(() => (numpadMode === 'speed_lock' ? onSpeedDigit('9') : onDigit('9')))
          }
          className="min-h-[64px] rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700 active:scale-[0.97] transition-all flex items-center justify-center text-3xl font-extrabold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          9
        </button>
        <button
          type="button"
          onClick={() => handlePress(numpadMode === 'speed_lock' ? onSpeedBackspace : onBackspace)}
          aria-label="Xóa lùi"
          className="min-h-[64px] rounded-xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-800/80 active:bg-rose-200 dark:active:bg-rose-900 active:scale-[0.97] transition-all flex flex-col items-center justify-center text-rose-700 dark:text-rose-300 shadow-sm"
        >
          <Delete className="w-6 h-6 stroke-[2.2]" />
          <span className="text-[10px] font-bold mt-0.5">XÓA</span>
        </button>

        {/* ROW 2 */}
        <button
          type="button"
          onClick={() =>
            handlePress(() => (numpadMode === 'speed_lock' ? onSpeedDigit('4') : onDigit('4')))
          }
          className="min-h-[64px] rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700 active:scale-[0.97] transition-all flex items-center justify-center text-3xl font-extrabold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          4
        </button>
        <button
          type="button"
          onClick={() =>
            handlePress(() => (numpadMode === 'speed_lock' ? onSpeedDigit('5') : onDigit('5')))
          }
          className="min-h-[64px] rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700 active:scale-[0.97] transition-all flex items-center justify-center text-3xl font-extrabold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          5
        </button>
        <button
          type="button"
          onClick={() =>
            handlePress(() => (numpadMode === 'speed_lock' ? onSpeedDigit('6') : onDigit('6')))
          }
          className="min-h-[64px] rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700 active:scale-[0.97] transition-all flex items-center justify-center text-3xl font-extrabold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          6
        </button>

        {/* Button: . (Full mode) or Quick +0.1 in Speed mode */}
        <button
          type="button"
          onClick={() =>
            handlePress(numpadMode === 'speed_lock' ? () => onAddTareShortcut(0.1) : onDecimal)
          }
          className="min-h-[64px] rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-800/80 active:bg-amber-200 dark:active:bg-amber-900 active:scale-[0.97] transition-all flex flex-col items-center justify-center text-amber-700 dark:text-amber-300 shadow-sm"
        >
          {numpadMode === 'speed_lock' ? (
            <>
              <span className="text-xl font-black">+0.1</span>
              <span className="text-[9px] font-bold">NHÍCH</span>
            </>
          ) : (
            <span className="text-4xl font-extrabold leading-none">.</span>
          )}
        </button>

        {/* ROW 3 & ROW 4 with SUBMIT taking 2 rows */}
        <button
          type="button"
          onClick={() =>
            handlePress(() => (numpadMode === 'speed_lock' ? onSpeedDigit('1') : onDigit('1')))
          }
          className="min-h-[64px] rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700 active:scale-[0.97] transition-all flex items-center justify-center text-3xl font-extrabold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          1
        </button>
        <button
          type="button"
          onClick={() =>
            handlePress(() => (numpadMode === 'speed_lock' ? onSpeedDigit('2') : onDigit('2')))
          }
          className="min-h-[64px] rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700 active:scale-[0.97] transition-all flex items-center justify-center text-3xl font-extrabold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          2
        </button>
        <button
          type="button"
          onClick={() =>
            handlePress(() => (numpadMode === 'speed_lock' ? onSpeedDigit('3') : onDigit('3')))
          }
          className="min-h-[64px] rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700 active:scale-[0.97] transition-all flex items-center justify-center text-3xl font-extrabold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          3
        </button>

        {/* NHẬP button spans row 3 and row 4 (2 rows tall) */}
        <button
          type="button"
          onClick={() => handlePress(handleManualSubmit)}
          className="row-span-2 min-h-[136px] rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 active:scale-[0.98] transition-all flex flex-col items-center justify-center text-white shadow-lg shadow-emerald-700/25 border-2 border-emerald-500 text-center px-1"
        >
          <CornerDownLeft className="w-8 h-8 stroke-[2.8] mb-1" />
          <span className="text-xl font-black tracking-wider uppercase">NHẬP</span>
          <span className="text-[10px] font-bold opacity-80 mt-0.5">
            {numpadMode === 'speed_lock' && autoCommit ? 'HOẶC TỰ LƯU 0.35s' : 'XÁC NHẬN'}
          </span>
        </button>

        {/* ROW 4 */}
        {/* '0' spans 2 columns */}
        <button
          type="button"
          onClick={() =>
            handlePress(() => (numpadMode === 'speed_lock' ? onSpeedDigit('0') : onDigit('0')))
          }
          className="col-span-2 min-h-[64px] rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 active:bg-slate-200 dark:active:bg-slate-700 active:scale-[0.97] transition-all flex items-center justify-center text-3xl font-extrabold text-slate-800 dark:text-slate-100 shadow-sm"
        >
          0
        </button>

        {/* '+0.2' Nhơn Hòa Shortcut button */}
        <button
          type="button"
          onClick={() => handlePress(() => onAddTareShortcut(0.2))}
          className="min-h-[64px] rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-300 dark:border-emerald-800/80 active:bg-emerald-200 dark:active:bg-emerald-900 active:scale-[0.97] transition-all flex flex-col items-center justify-center text-emerald-800 dark:text-emerald-300 shadow-sm"
          title="Cộng thêm 0.2 kg"
        >
          <div className="flex items-center font-extrabold text-xl text-emerald-700 dark:text-emerald-300">
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>0.2</span>
          </div>
          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">VẠCH LẺ</span>
        </button>
      </div>
    </div>
  );
};
