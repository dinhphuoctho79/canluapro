import React from 'react';
import { AlertTriangle, RotateCcw, CheckCircle2 } from 'lucide-react';

interface AbnormalWeightModalProps {
  isOpen: boolean;
  weight: number;
  bagIndex: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export const AbnormalWeightModal: React.FC<AbnormalWeightModalProps> = ({
  isOpen,
  weight,
  bagIndex,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const isTooLight = weight < 35;
  const isTooHeavy = weight > 75;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border-2 border-rose-500 rounded-3xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
        {/* Warning Icon Badge */}
        <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
          <AlertTriangle className="w-8 h-8 animate-bounce" />
        </div>

        <div className="text-center mb-4">
          <h3 className="text-lg font-black text-rose-600 dark:text-rose-400 uppercase tracking-tight">
            CẢNH BÁO SỐ CÂN BẤT THƯỜNG!
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Bao số #{bagIndex} có trọng lượng:
          </p>

          <div className="my-2 py-2 px-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 inline-block">
            <span className="font-mono text-4xl font-black text-rose-600 dark:text-rose-400">
              {weight.toFixed(1)}
            </span>
            <span className="font-mono text-xl font-bold text-rose-500 ml-1">KG</span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 px-2 mt-1">
            {isTooLight && (
              <span>
                Trọng lượng <strong>nhỏ hơn 35kg</strong> (quá nhẹ so với bao lúa thông thường 45kg - 65kg). Có thể là bao vét đuôi bờ hoặc gõ nhầm số?
              </span>
            )}
            {isTooHeavy && (
              <span>
                Trọng lượng <strong>lớn hơn 75kg</strong> (quá nặng, vượt chuẩn cân 1 bao lúa). Thợ vác có thể đặt đè 2 bao hoặc gõ nhầm số?
              </span>
            )}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>SỬA LẠI NGAY (KHÔNG LƯU)</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Xác nhận đúng (Vẫn nhập bao này)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
