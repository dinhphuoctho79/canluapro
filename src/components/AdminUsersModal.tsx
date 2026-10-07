import React, { useState, useEffect } from 'react';
import { X, Search, Users, Shield, KeyRound, Check, RefreshCw, AlertCircle, CheckCircle2, UserPlus, Plus, CheckCircle, Ban, Clock } from 'lucide-react';
import { UserProfile, UserRole, AccountStatus, adminFetchProfiles, adminUpdateRole, adminUpdateStatus, updateUserPassword, adminCreateUser } from '../utils/supabaseClient';

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({ isOpen, onClose }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form tạo tài khoản mới
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [newPhone, setNewPhone] = useState<string>('');
  const [newName, setNewName] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('trader');
  const [newStatus, setNewStatus] = useState<AccountStatus>('active');
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const loadData = async (query: string = '') => {
    setIsLoading(true);
    const { profiles: list } = await adminFetchProfiles(query);
    setProfiles(list);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadData(search);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    loadData(val);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    const { profile, error } = await adminCreateUser(newPhone, newName, newPass, newRole, newStatus);
    setIsCreating(false);

    if (error) {
      setNotification({ type: 'error', message: error });
    } else if (profile) {
      setNotification({ type: 'success', message: `Đã tạo tài khoản cho ${profile.full_name} (${profile.phone})` });
      setShowCreateForm(false);
      setNewPhone('');
      setNewName('');
      setNewPass('');
      loadData(search);
    }
    setTimeout(() => setNotification(null), 3000);
  };

  const handleRoleChange = async (userId: string, newRoleVal: UserRole) => {
    const { success, error } = await adminUpdateRole(userId, newRoleVal);
    if (success) {
      setNotification({ type: 'success', message: 'Cập nhật vai trò thành công!' });
      setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, role: newRoleVal } : p)));
    } else {
      setNotification({ type: 'error', message: error || 'Lỗi cập nhật vai trò' });
    }
    setTimeout(() => setNotification(null), 2500);
  };

  const handleStatusChange = async (userId: string, newStatusVal: AccountStatus) => {
    const { success, error } = await adminUpdateStatus(userId, newStatusVal);
    if (success) {
      const msg = newStatusVal === 'active' ? 'Đã duyệt kích hoạt tài khoản!' : newStatusVal === 'blocked' ? 'Đã khóa tài khoản!' : 'Chuyển về trạng thái chờ duyệt!';
      setNotification({ type: 'success', message: msg });
      setProfiles((prev) => prev.map((p) => (p.id === userId ? { ...p, status: newStatusVal } : p)));
    } else {
      setNotification({ type: 'error', message: error || 'Lỗi cập nhật trạng thái' });
    }
    setTimeout(() => setNotification(null), 2500);
  };

  const handleAdminResetPassword = async (userId: string) => {
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setNotification({ type: 'error', message: 'Mật khẩu mới phải từ 6 ký tự trở lên' });
      return;
    }

    const { success, error } = await updateUserPassword(newPasswordInput);
    if (success) {
      setNotification({ type: 'success', message: 'Đã đặt lại mật khẩu cho tài khoản!' });
      setEditingUserId(null);
      setNewPasswordInput('');
    } else {
      setNotification({ type: 'error', message: error || 'Lỗi đặt lại mật khẩu' });
    }
    setTimeout(() => setNotification(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl text-slate-900 dark:text-white my-auto flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg leading-tight">
                Quản Trị Người Dùng & Phân Quyền
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Cấp quyền & đặt lại mật khẩu theo số điện thoại
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

        {/* Thông báo */}
        {notification && (
          <div className={`mb-3 p-2.5 rounded-xl border text-xs flex items-center gap-2 shrink-0 ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
          }`}>
            {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{notification.message}</span>
          </div>
        )}

        {/* Hàng tìm kiếm & nút tạo tài khoản */}
        <div className="flex gap-2 mb-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo số điện thoại hoặc họ tên..."
              value={search}
              onChange={handleSearchChange}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            {showCreateForm ? <X className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            <span>{showCreateForm ? 'Đóng Form' : 'Tạo Tài Khoản'}</span>
          </button>
        </div>

        {/* Form tạo tài khoản trực tiếp (Admin cấp quyền cho bạn hàng) */}
        {showCreateForm && (
          <form
            onSubmit={handleCreateSubmit}
            className="mb-3 p-3.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2.5 shrink-0 animate-in slide-in-from-top-2"
          >
            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              <span>Cấp tài khoản mới cho Bạn Hàng / Thương Lái:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <input
                type="tel"
                placeholder="Số điện thoại (VD: 0988776655)"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                required
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 font-mono outline-none"
              />
              <input
                type="text"
                placeholder="Họ và tên (VD: Út Cò Tân Hưng)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 outline-none"
              />
              <input
                type="text"
                placeholder="Mật khẩu ban đầu (>= 6 ký tự)"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                required
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 font-mono outline-none"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 font-bold outline-none cursor-pointer"
              >
                <option value="trader">⚖️ Thương Lái / Thợ Cân</option>
                <option value="farmer">🌾 Nông Dân (Chủ Ruộng)</option>
                <option value="admin">👑 Quản Trị Viên (Admin)</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-xs rounded-xl font-bold"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isCreating}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {isCreating ? 'Đang tạo...' : 'Xác Nhận Cấp Tài Khoản'}
              </button>
            </div>
          </form>
        )}

        {/* Danh sách người dùng */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
              <span>Đang tải danh sách người dùng...</span>
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Không tìm thấy người dùng nào phù hợp.
            </div>
          ) : (
            profiles.map((p) => (
              <div
                key={p.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{p.full_name}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{p.phone}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      p.status === 'active'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300'
                        : p.status === 'pending'
                        ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 animate-pulse'
                        : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300'
                    }`}>
                      {p.status === 'active' ? 'Đã duyệt' : p.status === 'pending' ? 'Chờ duyệt' : 'Đã khóa'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    ID: {p.id.slice(0, 8)}... &bull; Tạo: {new Date(p.created_at).toLocaleDateString('vi-VN')}
                    {p.approved_at && ` • Duyệt: ${new Date(p.approved_at).toLocaleDateString('vi-VN')}`}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Nút duyệt nhanh nếu đang pending */}
                  {p.status === 'pending' && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(p.id, 'active')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-sm transition-all"
                      title="Phê duyệt kích hoạt tài khoản ngay"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Duyệt Ngay</span>
                    </button>
                  )}

                  {/* Dropdown trạng thái phê duyệt */}
                  <select
                    value={p.status || 'pending'}
                    onChange={(e) => handleStatusChange(p.id, e.target.value as AccountStatus)}
                    className={`border rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer ${
                      p.status === 'active'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-400'
                        : p.status === 'pending'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 text-amber-700 dark:text-amber-400'
                        : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    <option value="active">✅ Kích hoạt</option>
                    <option value="pending">⏳ Chờ duyệt</option>
                    <option value="blocked">🚫 Khóa</option>
                  </select>

                  {/* Dropdown vai trò */}
                  <select
                    value={p.role}
                    onChange={(e) => handleRoleChange(p.id, e.target.value as UserRole)}
                    className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="trader">⚖️ Thương Lái</option>
                    <option value="farmer">🌾 Nông Dân</option>
                    <option value="admin">👑 Admin</option>
                  </select>

                  {/* Nút đặt lại mật khẩu */}
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUserId(editingUserId === p.id ? null : p.id);
                      setNewPasswordInput('');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800 font-bold flex items-center gap-1 hover:bg-amber-200 transition-colors"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Đổi MK</span>
                  </button>
                </div>

                {/* Form nhập MK mới khi click Đổi MK */}
                {editingUserId === p.id && (
                  <div className="w-full pt-2 border-t border-slate-200 dark:border-slate-700 flex gap-2 items-center">
                    <input
                      type="password"
                      placeholder="Nhập mật khẩu mới cho user..."
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-mono outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleAdminResetPassword(p.id)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                    >
                      Lưu MK
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-xs rounded-lg"
                    >
                      Hủy
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
