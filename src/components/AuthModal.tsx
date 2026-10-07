import React, { useState } from 'react';
import { X, Lock, Phone, User, ShieldCheck, LogIn, UserPlus, KeyRound, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { UserProfile, UserRole, loginWithPhone, registerWithPhone, updateUserPassword, logoutUser, isSupabaseConfigured } from '../utils/supabaseClient';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onUserChanged: (user: UserProfile | null) => void;
  onStartDemoMode?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChanged,
  onStartDemoMode,
}) => {
  const [tab, setTab] = useState<'login' | 'register' | 'change_password'>('login');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [role, setRole] = useState<UserRole>('farmer');
  const [newPassword, setNewPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleStartQuickDemo = () => {
    const demoProfile: UserProfile = {
      id: 'demo-trader-namco',
      phone: '0988888888',
      full_name: 'Thương Lái Út Lúa (Phiên Trải Nghiệm)',
      role: 'trader',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('canlua_user_profile', JSON.stringify(demoProfile));
    onUserChanged(demoProfile);
    if (onStartDemoMode) {
      onStartDemoMode();
    }
    setSuccessMsg('Đã kích hoạt chế độ Demo: Ruộng Chú Năm Cò (150 bao)!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const { profile, error } = await loginWithPhone(phone, password);
    setIsLoading(false);

    if (error) {
      setErrorMsg(error);
    } else if (profile) {
      onUserChanged(profile);
      setSuccessMsg(`Đăng nhập thành công! Chào ${profile.full_name}`);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const { profile, error } = await registerWithPhone(phone, password, fullName, role);
    setIsLoading(false);

    if (error) {
      setErrorMsg(error);
    } else if (profile) {
      onUserChanged(profile);
      setSuccessMsg(`Đăng ký thành công! Chào mừng ${profile.full_name}`);
      setTimeout(() => {
        onClose();
      }, 1000);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const { success, error } = await updateUserPassword(newPassword);
    setIsLoading(false);

    if (error) {
      setErrorMsg(error);
    } else if (success) {
      setSuccessMsg('Đổi mật khẩu thành công!');
      setNewPassword('');
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    onUserChanged(null);
    setSuccessMsg('Đã đăng xuất tài khoản.');
    setTimeout(() => {
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl text-slate-900 dark:text-white my-auto animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                {currentUser ? 'Tài Khoản Của Bạn' : tab === 'login' ? 'Đăng Nhập SĐT' : 'Đăng Ký Tài Khoản'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isSupabaseConfigured ? 'Xác thực bảo mật Supabase' : 'Chế độ Demo / Cục bộ'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo lỗi / thành công */}
        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* NẾU ĐÃ ĐĂNG NHẬP */}
        {currentUser ? (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Họ và tên:</span>
                <span className="font-bold text-sm">{currentUser.full_name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Số điện thoại:</span>
                <span className="font-mono font-bold text-sm">{currentUser.phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">Vai trò:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-black uppercase ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300'
                    : currentUser.role === 'trader'
                    ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 border border-blue-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300'
                }`}>
                  {currentUser.role === 'admin' ? 'Quản Trị Viên (Admin)' : currentUser.role === 'trader' ? 'Thương Lái / Thợ Cân' : 'Nông Dân (Chủ Ruộng)'}
                </span>
              </div>
            </div>

            {/* Đổi mật khẩu */}
            <form onSubmit={handleChangePassword} className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                Đổi mật khẩu mới:
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Mật khẩu mới (>= 6 ký tự)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="submit"
                  disabled={isLoading || !newPassword}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  Lưu
                </button>
              </div>
            </form>

            {/* Nút Đăng xuất */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 font-bold text-xs flex items-center justify-center gap-2 transition-colors border border-rose-200 dark:border-rose-800"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng Xuất Tài Khoản</span>
            </button>
          </div>
        ) : (
          /* NẾU CHƯA ĐĂNG NHẬP */
          <div>
            {/* NÚT TRẢI NGHIỆM NHANH (DEMO) */}
            <div className="mb-4 p-3 bg-gradient-to-r from-emerald-500/10 via-amber-500/10 to-emerald-500/10 dark:from-emerald-950/40 dark:via-amber-950/30 dark:to-emerald-950/40 rounded-2xl border-2 border-dashed border-emerald-500/40 text-center">
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 font-medium">
                Dùng thử đầy đủ tính năng cân lúa ngoài bờ ruộng:
              </p>
              <button
                type="button"
                onClick={handleStartQuickDemo}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <span>🌾</span>
                <span>Trải Nghiệm Nhanh (Mẻ Ruộng Mẫu 150 Bao)</span>
              </button>
            </div>

            {/* Tabs chọn Đăng nhập / Đăng ký */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4 text-xs font-bold">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`py-2 rounded-lg transition-all ${
                  tab === 'login'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`py-2 rounded-lg transition-all ${
                  tab === 'register'
                    ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                Tạo Tài Khoản
              </button>
            </div>

            {tab === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    Số điện thoại:
                  </label>
                  <input
                    type="tel"
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    Mật khẩu:
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all mt-2 disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    Họ và tên:
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nguyễn Văn Út"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    Số điện thoại:
                  </label>
                  <input
                    type="tel"
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    Mật khẩu:
                  </label>
                  <input
                    type="password"
                    placeholder="Tối thiểu 6 ký tự"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700 dark:text-slate-300">
                    Vai trò của bạn:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('farmer')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        role === 'farmer'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      🌾 Nông Dân
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('trader')}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                        role === 'trader'
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      ⚖️ Thương Lái / Thợ Cân
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all mt-2 disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isLoading ? 'Đang tạo...' : 'Tạo Tài Khoản Mới'}</span>
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
