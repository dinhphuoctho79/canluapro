import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Đọc thông tin từ biến môi trường Vite (hoặc fallback nếu chưa cấu hình)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type UserRole = 'farmer' | 'trader' | 'admin';

export interface UserProfile {
  id: string;
  phone: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

// Chuẩn hóa số điện thoại: bỏ khoảng trắng, dấu chấm, dấu gạch nối
export function cleanPhoneNumber(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.startsWith('84')) {
    clean = '0' + clean.slice(2);
  }
  return clean;
}

// Tạo email nội bộ để xác thực không cần SMS OTP
export function phoneToAuthEmail(phone: string): string {
  const clean = cleanPhoneNumber(phone);
  return `${clean}@canluapro.local`;
}

export const DEFAULT_ADMIN = {
  phone: '0393990638',
  password: 'CanluaPro@2026',
  fullName: 'Admin Nguyễn Công Dinh (Cần Thơ)',
  role: 'admin' as UserRole,
};

// 1. ĐĂNG NHẬP BẰNG SĐT + MẬT KHẨU
export async function loginWithPhone(phone: string, password: string): Promise<{ profile: UserProfile | null; error: string | null }> {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 9) {
    return { profile: null, error: 'Số điện thoại không hợp lệ' };
  }
  if (!password || password.length < 6) {
    return { profile: null, error: 'Mật khẩu phải từ 6 ký tự trở lên' };
  }

  // Khởi tạo/nhận diện tài khoản Super Admin mặc định
  if (cleanPhone === DEFAULT_ADMIN.phone && password === DEFAULT_ADMIN.password) {
    const adminProfile: UserProfile = {
      id: 'admin-super-0393990638',
      phone: DEFAULT_ADMIN.phone,
      full_name: DEFAULT_ADMIN.fullName,
      role: 'admin',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('canlua_user_profile', JSON.stringify(adminProfile));
    return { profile: adminProfile, error: null };
  }

  // Nếu chưa cấu hình Supabase, dùng Local Session Demo
  if (!supabase) {
    const demoProfile: UserProfile = {
      id: `local-${cleanPhone}`,
      phone: cleanPhone,
      full_name: cleanPhone === '0393990638' ? 'Admin Nguyễn Công Dinh' : 'Người dùng ' + cleanPhone,
      role: cleanPhone === '0393990638' ? 'admin' : (cleanPhone.endsWith('88') ? 'trader' : 'farmer'),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('canlua_user_profile', JSON.stringify(demoProfile));
    return { profile: demoProfile, error: null };
  }

  try {
    const email = phoneToAuthEmail(cleanPhone);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return { profile: null, error: authError.message };
    }

    if (!authData.user) {
      return { profile: null, error: 'Không tìm thấy tài khoản' };
    }

    // Lấy profile từ bảng profiles
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profileData) {
      // Nếu chưa có row trong profiles, tạo mới
      const newProfile: UserProfile = {
        id: authData.user.id,
        phone: cleanPhone,
        full_name: authData.user.user_metadata?.full_name || 'Người dùng ' + cleanPhone,
        role: (authData.user.user_metadata?.role as UserRole) || 'farmer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await supabase.from('profiles').insert([newProfile]);
      localStorage.setItem('canlua_user_profile', JSON.stringify(newProfile));
      return { profile: newProfile, error: null };
    }

    localStorage.setItem('canlua_user_profile', JSON.stringify(profileData));
    return { profile: profileData as UserProfile, error: null };
  } catch (err: unknown) {
    return { profile: null, error: err instanceof Error ? err.message : 'Lỗi kết nối máy chủ' };
  }
}

// 2. ĐĂNG KÝ TÀI KHOẢN MỚI BẰNG SĐT + MẬT KHẨU
export async function registerWithPhone(
  phone: string,
  password: string,
  fullName: string,
  role: UserRole = 'farmer'
): Promise<{ profile: UserProfile | null; error: string | null }> {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 9) {
    return { profile: null, error: 'Số điện thoại không hợp lệ' };
  }
  if (!password || password.length < 6) {
    return { profile: null, error: 'Mật khẩu phải từ 6 ký tự trở lên' };
  }
  if (!fullName.trim()) {
    return { profile: null, error: 'Vui lòng nhập họ và tên' };
  }

  if (!supabase) {
    const newProfile: UserProfile = {
      id: `local-${cleanPhone}`,
      phone: cleanPhone,
      full_name: fullName.trim(),
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem('canlua_user_profile', JSON.stringify(newProfile));
    return { profile: newProfile, error: null };
  }

  try {
    const email = phoneToAuthEmail(cleanPhone);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone: cleanPhone,
          full_name: fullName.trim(),
          role,
        },
      },
    });

    if (authError) {
      return { profile: null, error: authError.message };
    }

    if (!authData.user) {
      return { profile: null, error: 'Đăng ký thất bại' };
    }

    const profile: UserProfile = {
      id: authData.user.id,
      phone: cleanPhone,
      full_name: fullName.trim(),
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabase.from('profiles').upsert([profile]);
    localStorage.setItem('canlua_user_profile', JSON.stringify(profile));
    return { profile, error: null };
  } catch (err: unknown) {
    return { profile: null, error: err instanceof Error ? err.message : 'Lỗi kết nối' };
  }
}

// 3. ĐĂNG XUẤT
export async function logoutUser(): Promise<void> {
  localStorage.removeItem('canlua_user_profile');
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
  }
}

// 4. LẤY PROFILE HIỆN TẠI
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const cached = localStorage.getItem('canlua_user_profile');
  if (cached) {
    try {
      return JSON.parse(cached) as UserProfile;
    } catch {
      // ignore
    }
  }

  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profile) {
      localStorage.setItem('canlua_user_profile', JSON.stringify(profile));
      return profile as UserProfile;
    }
  } catch {
    // ignore
  }
  return null;
}

// 5. NGƯỜI DÙNG TỰ ĐỔI MẬT KHẨU
export async function updateUserPassword(newPassword: string): Promise<{ success: boolean; error: string | null }> {
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Mật khẩu mới phải từ 6 ký tự trở lên' };
  }

  if (!supabase) {
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi cập nhật mật khẩu' };
  }
}

// 6. DÀNH CHO ADMIN: LẤY DANH SÁCH TẤT CẢ NGƯỜI DÙNG
export async function adminFetchProfiles(searchQuery: string = ''): Promise<{ profiles: UserProfile[]; error: string | null }> {
  if (!supabase) {
    // Mock profiles cho admin trải nghiệm offline (kết hợp các user đã tạo)
    const defaultList: UserProfile[] = [
      { id: '1', phone: '0393990638', full_name: 'Nguyễn Công Dinh (Admin Cần Thơ)', role: 'admin', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '2', phone: '0912345678', full_name: 'Chú Ba Ruộng Thới Lai', role: 'farmer', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '3', phone: '0988888888', full_name: 'Thương Lái Út Lúa Tân Hưng', role: 'trader', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ];
    let customList: UserProfile[] = [];
    try {
      const stored = localStorage.getItem('canlua_mock_users');
      if (stored) customList = JSON.parse(stored);
    } catch {
      // ignore
    }
    const combined = [...customList, ...defaultList.filter(d => !customList.some(c => c.phone === d.phone))];
    if (searchQuery) {
      return { profiles: combined.filter(p => p.phone.includes(searchQuery) || p.full_name.toLowerCase().includes(searchQuery.toLowerCase())), error: null };
    }
    return { profiles: combined, error: null };
  }

  try {
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (searchQuery.trim()) {
      query = query.or(`phone.ilike.%${searchQuery.trim()}%,full_name.ilike.%${searchQuery.trim()}%`);
    }

    const { data, error } = await query;
    if (error) return { profiles: [], error: error.message };
    return { profiles: (data as UserProfile[]) || [], error: null };
  } catch (err: unknown) {
    return { profiles: [], error: err instanceof Error ? err.message : 'Lỗi truy vấn' };
  }
}

// 7. DÀNH CHO ADMIN: CẬP NHẬT VAI TRÒ (ROLE)
export async function adminUpdateRole(userId: string, newRole: UserRole): Promise<{ success: boolean; error: string | null }> {
  if (!supabase) {
    try {
      const stored = localStorage.getItem('canlua_mock_users');
      let list: UserProfile[] = stored ? JSON.parse(stored) : [];
      list = list.map(u => u.id === userId ? { ...u, role: newRole, updated_at: new Date().toISOString() } : u);
      localStorage.setItem('canlua_mock_users', JSON.stringify(list));
    } catch {
      // ignore
    }
    return { success: true, error: null };
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) return { success: false, error: error.message };
    return { success: true, error: null };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Lỗi cập nhật quyền' };
  }
}

// 8. DÀNH CHO ADMIN: TẠO TÀI KHOẢN MỚI TRỰC TIẾP CHO BẠN HÀNG/THƯƠNG LÁI
export async function adminCreateUser(
  phone: string,
  fullName: string,
  initialPassword: string,
  role: UserRole
): Promise<{ profile: UserProfile | null; error: string | null }> {
  const cleanPhone = cleanPhoneNumber(phone);
  if (!cleanPhone || cleanPhone.length < 9) {
    return { profile: null, error: 'Số điện thoại không hợp lệ' };
  }
  if (!fullName.trim()) {
    return { profile: null, error: 'Vui lòng nhập họ và tên' };
  }
  if (!initialPassword || initialPassword.length < 6) {
    return { profile: null, error: 'Mật khẩu khởi tạo phải từ 6 ký tự trở lên' };
  }

  if (!supabase) {
    const newProfile: UserProfile = {
      id: `local-created-${Date.now()}`,
      phone: cleanPhone,
      full_name: fullName.trim(),
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    try {
      const stored = localStorage.getItem('canlua_mock_users');
      const list: UserProfile[] = stored ? JSON.parse(stored) : [];
      list.unshift(newProfile);
      localStorage.setItem('canlua_mock_users', JSON.stringify(list));
    } catch {
      // ignore
    }
    return { profile: newProfile, error: null };
  }

  try {
    const email = phoneToAuthEmail(cleanPhone);
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password: initialPassword,
      options: {
        data: {
          phone: cleanPhone,
          full_name: fullName.trim(),
          role,
        },
      },
    });

    if (authError) return { profile: null, error: authError.message };
    if (!authData.user) return { profile: null, error: 'Không thể tạo user' };

    const newProfile: UserProfile = {
      id: authData.user.id,
      phone: cleanPhone,
      full_name: fullName.trim(),
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabase.from('profiles').upsert([newProfile]);
    return { profile: newProfile, error: null };
  } catch (err: unknown) {
    return { profile: null, error: err instanceof Error ? err.message : 'Lỗi kết nối tạo tài khoản' };
  }
}

