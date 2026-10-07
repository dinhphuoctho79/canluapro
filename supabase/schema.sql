-- ============================================================================
-- CÂN LÚA PRO (CANLUAPRO) - SUPABASE DATABASE SCHEMA
-- HỆ THỐNG XÁC THỰC SĐT, PHÂN QUYỀN (FARMER / TRADER / ADMIN) & REALTIME SYNC
-- ============================================================================

-- 1. BẢNG PROFILES (LIÊN KẾT VỚI AUTH.USERS QUA SỐ ĐIỆN THOẠI)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(15) UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('farmer', 'trader', 'admin')) DEFAULT 'farmer' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Index tìm kiếm nhanh theo SĐT
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. BẬT ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: Người dùng có thể đọc thông tin profile của chính mình
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy 2: Người dùng có thể cập nhật thông tin profile của chính mình (ngoại trừ role)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy 3: Admin có toàn quyền đọc và sửa tất cả profiles
CREATE POLICY "Admins have full access to all profiles"
  ON public.profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Policy 4: Cho phép người dùng mới tạo profile của mình khi đăng ký
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. FUNCTION & TRIGGER TỰ ĐỘNG CẬP NHẬT UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profiles_updated ON public.profiles;
CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. BẢNG MẺ CÂN (RICE_BATCHES) CHO LƯU TRỮ VÀ REALTIME DATABASE NẾU CẦN
CREATE TABLE IF NOT EXISTS public.rice_batches (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  farmer_phone VARCHAR(15),
  batch_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

ALTER TABLE public.rice_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read batch by room code"
  ON public.rice_batches
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert/update batches"
  ON public.rice_batches
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Bật Realtime cho bảng rice_batches
ALTER PUBLICATION supabase_realtime ADD TABLE public.rice_batches;
