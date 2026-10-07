-- ============================================================================
-- CÂN LÚA PRO (CANLUAPRO) - SUPABASE DATABASE MIGRATION: ACCOUNT APPROVAL (SaaS)
-- Quản lý trạng thái phê duyệt tài khoản: pending | active | blocked
-- ============================================================================

-- 1. Bổ sung trường trạng thái phê duyệt (status) vào bảng profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('pending', 'active', 'blocked')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS subscription_note TEXT;

-- 2. Đảm bảo Super Admin mặc định luôn có role = 'admin' và status = 'active'
UPDATE public.profiles 
SET role = 'admin', status = 'active', approved_at = NOW() 
WHERE phone = '0393990638';

-- 3. Cập nhật Policy: Chỉ profile có status = 'active' mới được phép cập nhật dữ liệu cá nhân
DROP POLICY IF EXISTS "Người dùng active mới được thao tác dữ liệu" ON public.profiles;
CREATE POLICY "Người dùng active mới được thao tác dữ liệu" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (
  (auth.uid() = id AND status = 'active') OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
)
WITH CHECK (
  (auth.uid() = id AND status = 'active') OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
