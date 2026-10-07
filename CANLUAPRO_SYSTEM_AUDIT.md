# BÁO CÁO TOÀN DIỆN KIẾN TRÚC HỆ THỐNG VÀ THƯƠNG MẠI HÓA (SAAS)
# DỰ ÁN: CÂN LÚA PRO (CANLUAPRO)
> **Tài liệu bàn giao kỹ thuật & Đánh giá kiến trúc dành cho ChatGPT / Senior Solution Architects**  
> **Thời điểm xuất báo cáo:** Tháng 10/2026  
> **Tác giả / Nhà phát triển:** Nguyễn Công Dinh (Cần Thơ)  
> **Kho mã nguồn:** [GitHub - dinhphuoctho79/canluapro](https://github.com/dinhphuoctho79/canluapro)  
> **Nền tảng triển khai:** Vercel Production + Supabase Cloud  

---

## MỤC LỤC
1. [Tổng Quan Hệ Thống & Tech Stack Thực Tế](#1-tổng-quan-hệ-thống--tech-stack-thực-tế)
2. [Kiến Trúc Dữ Liệu & Database Schema](#2-kiến-trúc-dữ-liệu--database-schema)
3. [Danh Mục Tính Năng & Tiến Độ Hoàn Thiện](#3-danh-mục-tính-năng--tiến-độ-hoàn-thiện)
4. [Điểm Nghẽn Kỹ Thuật & Yêu Cầu Cần Tư Vấn](#4-điểm-nghẽn-kỹ-thuật--yêu-cầu-cần-tư-vấn)
5. [Hướng Dẫn Chạy & Kiểm Thử Hệ Thống](#5-hướng-dẫn-chạy--kiểm-thử-hệ-thống)

---

## 1. TỔNG QUAN HỆ THỐNG & TECH STACK THỰC TẾ

### 1.1 Mục Tiêu & Nghiệp Vụ Thực Tế
**Cân Lúa Pro (CanLuaPro)** là ứng dụng web PWA chuyên biệt hóa cho hoạt động thu mua lúa trực tiếp tại bờ ruộng ở vùng Đồng Bằng Sông Cửu Long (ĐBSCL). Nghiệp vụ thu mua lúa có các đặc thù khắt khe:
- **Tốc độ cân cực nhanh:** Cân từ 500 đến 3.000 bao lúa/ngày với tốc độ 2 - 3 giây/bao.
- **Môi trường hoạt động khắc nghiệt:** Dưới trời nắng gắt, chói chang ngoài đồng ruộng, sóng mạng 3G/4G chập chờn, không có nguồn điện lưới.
- **Tính minh bạch tuyệt đối:** Cả nông dân (chủ ruộng) và thương lái (người mua) đều phải nhìn thấy số cân cùng lúc theo thời gian thực để tránh hoài nghi gian lận.
- **Quyết toán phức tạp ngay tại bờ ruộng:** Phải tính toán trừ vỏ bao (hoặc trừ khoán), cấn trừ tiền cọc đã ứng trước, cấn trừ nợ giống/vật tư, tính chi phí bốc vác (chủ ruộng trả, lái trả hoặc chia đôi 50%), xuất file Excel cho chủ lò sấy, in phiếu nhiệt mini Bluetooth cầm tay và tạo mã VietQR Napas247 để chuyển tiền lúa tức thì.

### 1.2 Bảng Thống Kê Tech Stack (Trích xuất từ `package.json`)
| Phân hệ / Thư viện | Phiên bản | Vai trò kỹ thuật trong dự án |
| :--- | :--- | :--- |
| **Runtime & Bundler** | Node `>=22.12.0`, Vite `^8.3.0` | Khởi động cực nhanh, HMR tức thì, tối ưu kích thước bundle |
| **Core Framework** | React `^19.0.1`, React-DOM `^19.0.1` | Kiến trúc UI hiện đại, quản lý state mượt mà |
| **Language** | TypeScript `^5.8.3` | Định kiểu dữ liệu tài chính & batching chặt chẽ |
| **Styling & Icons** | Tailwind CSS `^4.3.3`, Lucide React `^0.546.0` | Thiết kế giao diện phản hồi nhanh, tối ưu chế độ nắng ngoài trời |
| **Animation** | Motion `^12.23.24` | Hiệu ứng chuyển động mượt mà cho Numpad và Dialog |
| **Backend & Realtime** | `@supabase/supabase-js ^2.117.2` | Xác thực người dùng, lưu trữ đám mây, kênh WebSocket Broadcast |
| **Xử lý Bảng tính Excel** | `xlsx` (SheetJS) `^0.18.5` | Sinh file Excel `.xlsx` tối ưu mở trực tiếp trên smartphone |
| **Mã QR & Thanh toán** | `qrcode ^1.5.4` | Sinh ảnh VietQR Napas247 chuẩn ngân hàng cả khi offline |
| **In ấn phần cứng** | Web Bluetooth API (`@types/web-bluetooth`) | Giao tiếp trực tiếp máy in nhiệt Bluetooth cầm tay ESC/POS 58mm/80mm |
| **Âm thanh trợ lý** | Web Speech API (TTS) & HTML5 Audio | Đọc loa số cân tự động sau mỗi bao lúa |

### 1.3 Hạ Tầng & Môi Trường Vận Hành
- **Frontend Hosting:** Vercel Edge Network (CI/CD tự động kích hoạt khi push vào nhánh `main`).
- **Database & Realtime Service:** Supabase Cloud
  - **Project ID:** `qtcvmvveqrcrlupzhiod`
  - **Project URL:** `https://qtcvmvveqrcrlupzhiod.supabase.co`
- **Chiến lược Hoạt Động Kép (Offline-First Hybrid):**
  - Khi có mạng: Đồng bộ WebSocket Realtime lên Supabase Broadcast cho nông dân quét mã QR xem cùng lúc.
  - Khi mất sóng ngoài đồng ruộng: Toàn bộ hệ thống tự động rơi về lưu trữ cục bộ (`localStorage`), không gây gián đoạn phiên cân.

---

## 2. KIẾN TRÚC DỮ LIỆU & DATABASE SCHEMA

Hệ thống kết hợp cơ sở dữ liệu quan hệ PostgreSQL trên Supabase và kiến trúc NoSQL Document lưu trong `localStorage`.

### 2.1 Cấu Trúc Bảng Supabase PostgreSQL

#### Bảng `public.profiles` (Quản lý phân quyền & Xét duyệt SaaS)
```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone VARCHAR(15) UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('farmer', 'trader', 'admin')) DEFAULT 'farmer' NOT NULL,
  status TEXT CHECK (status IN ('pending', 'active', 'blocked')) DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  subscription_note TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
```
- **Ý nghĩa các vai trò (`role`):**
  - `farmer` (Nông dân): Chỉ được xem giao diện phụ (Kiosk HUD), ẩn toàn bộ Numpad và menu quản lý.
  - `trader` (Thương lái): Quyền sử dụng toàn bộ tính năng cân, tạo mẻ, in ấn, xuất Excel. Nếu `status = 'pending'`, chỉ được dùng thử có giới hạn và có banner hướng dẫn liên hệ kích hoạt.
  - `admin` (Quản trị viên): Toàn quyền quản trị người dùng, duyệt kích hoạt, đổi quyền, reset mật khẩu khách hàng.
- **Ý nghĩa trạng thái xét duyệt (`status`):**
  - `pending`: Đăng ký mới, đang chờ Admin xác nhận gói dịch vụ.
  - `active`: Đã thanh toán / duyệt, toàn quyền sử dụng.
  - `blocked`: Bị tạm dừng do hết hạn thuê bao hoặc vi phạm.

#### Bảng `public.rice_batches` (Lưu trữ mẻ cân đám mây)
```sql
CREATE TABLE IF NOT EXISTS public.rice_batches (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  farmer_phone VARCHAR(15),
  batch_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

### 2.2 Chính Sách Bảo Mật Dữ Liệu (Row Level Security - RLS)
- **Profiles RLS:**
  - `Users can view own profile`: Người dùng chỉ đọc được profile của chính mình (`auth.uid() = id`).
  - `Người dùng active mới được thao tác dữ liệu`: Người dùng chỉ được sửa thông tin cá nhân khi `status = 'active'`. Super Admin được miễn trừ và thao tác trên mọi profile.
  - `Admins have full access to all profiles`: Admin có toàn quyền `SELECT, UPDATE, DELETE` với mọi người dùng.
- **Rice Batches RLS:**
  - Cho phép người dùng khách (`anon`) đọc dữ liệu mẻ cân qua mã phòng (Room Code) để phục vụ tính năng nông dân quét mã QR xem màn hình HUD mà không bắt buộc tạo tài khoản.

### 2.3 Cơ Chế Supabase Realtime Broadcast Handshake
Tệp triển khai: `src/utils/useRealtimeSync.ts`
- **Tên kênh:** `rice_batch_${roomCode}`
- **Cấu hình:** `broadcast: { self: false, ack: false }` (Bật chế độ không nhận lại echo packet của chính mình).
- **Giao thức Handshake 2 chiều:**
  ```mermaid
  sequenceDiagram
    autonumber
    actor T as Thợ Cân (Trader Phone/Laptop)
    participant S as Supabase Realtime WebSocket
    actor F as Nông Dân (Farmer Phone)
    
    T->>S: Tạo kênh rice_batch_CLP-01 (Subscribe)
    F->>S: Quét mã QR, vào phòng (Subscribe)
    F->>S: Gửi event 'request_latest_batch'
    S->>T: Chuyển tiếp yêu cầu dữ liệu
    T->>S: Phát sóng event 'batch_update' (toàn bộ RiceBatch)
    S->>F: Nhận dữ liệu & Render tức thì lên Farmer HUD
    Note over T,F: Khi Thợ Cân gõ số mới, event 'batch_update' tự động truyền đi trong < 100ms
  ```

### 2.4 Cấu Trúc Lưu Trữ Offline Cục Bộ (`localStorage`)
- **Key chính:** `canlua_mientay_batches_v3` (Mảng đối tượng `RiceBatch[]`)
- **Cấu trúc thực tế một đối tượng `RiceBatch` trong TypeScript (`src/types/index.ts`):**
```typescript
export interface RiceBatch {
  id: string;                    // VD: "batch-1775551200000"
  code: string;                  // VD: "CLP-20261007-01"
  date: string;                  // VD: "2026-10-07"
  farmerName: string;            // VD: "Chú Năm Cò"
  farmerPhone?: string;          // VD: "0912345678"
  farmerBankName?: string;       // Mã ngân hàng (VD: "vietcombank")
  farmerBankNumber?: string;     // Số tài khoản ngân hàng
  
  // Nghiệp vụ coi đồng & Cọc
  fieldAreaCong?: number;        // Diện tích (công tầm cắt / công lớn)
  harvestDate?: string;          // Ngày cắt lúa
  depositPerCong?: number;       // Cọc theo công (VNĐ/công)
  depositAmount: number;         // Tổng tiền cọc đã ứng (VNĐ)
  seedDebtAmount?: number;       // Tiền nợ lúa giống cấn trừ
  
  // Cò lúa & Vận chuyển & Bốc vác
  brokerName?: string;
  brokerFeePerKg?: number;
  porterFeePerBag: number;       // Đơn giá bốc vác (VD: 3.500 đ/bao)
  porterPayer: 'buyer' | 'farmer' | 'split'; // Lái trả | Dân trả | Chia đôi 50%
  transportType: 'boat' | 'truck';
  
  // Thông số mẻ cân chính
  riceVariety: string;           // VD: "Đài Thơm 8"
  pricePerKg: number;            // Đơn giá: 8.200 đ/kg
  tareWeightPerBag: number;      // Trừ bì: 0.2 kg/bao
  flatTareAmount?: number;       // Trừ khoán cả mẻ (kg)
  bagsPerSheet: number;          // 10 hoặc 20 bao/tờ
  weighingMode: 'nhon_hoa' | 'bluetooth';
  
  // Danh sách bao lúa và các lô con
  bags: BagEntry[];              // [{ id, bagIndex: 1, weight: 50.4, timestamp }]
  lots?: RiceLot[];              // Quản lý nhiều giống lúa trong cùng mẻ
  activeLotId?: string;
}
```

---

## 3. DANH MỤC TÍNH NĂNG & TIẾN ĐỘ HOÀN THIỆN

### 3.1 Bộ Tính Toán Tài Chính & Quyết Toán Bờ Ruộng (`FinancialSummary.tsx`, `export.ts`)
- **Thuật toán trừ bì linh hoạt:**
  - Hỗ trợ trừ bì từng bao: `Tổng bì = Tổng số bao * Trừ bì mỗi bao (mặc định 0.2 kg)`.
  - Hỗ trợ trừ khoán cả mẻ: Khi có `flatTareAmount > 0`, hệ thống ưu tiên trừ khoán và phân bổ tỷ lệ khối lượng công bằng cho từng lô lúa con.
- **Cơ chế fallback đơn giá an toàn (`activePrice`):**
  - Không bao giờ bị lỗi đơn giá 0 đ/kg dù người dùng đổi giá ở cấp độ Mẻ hay cấp độ Lô con:
    ```typescript
    const activePrice = Number(lot.pricePerKg) > 0 
      ? Number(lot.pricePerKg) 
      : (Number(batch.pricePerKg) > 0 ? Number(batch.pricePerKg) : 0);
    ```
- **Xử lý thấu suốt nợ âm (Nông dân nợ lại thương lái):**
  - Tuyệt đối không dùng `Math.max(0, finalPayout)` trong các luồng tài chính.
  - Khi tiền cọc + chi phí bốc vác vượt quá tổng tiền lúa (`finalPayout < 0`):
    - Đổi màu cảnh báo sang Amber/Red (`#F59E0B` / `#EF4444`).
    - Ghi rõ: `⚠️ NÔNG DÂN CÒN THIẾU LẠI LÁI: -... VNĐ`.
    - Đọc bằng chữ: *"Chủ ruộng còn thiếu lại thương lái ... đồng"*.

### 3.2 Màn Hình Nông Dân Kiosk HUD (`FarmerCompanionModal.tsx`)
- **Truy cập không rào cản:** Nông dân chỉ cần dùng Zalo hoặc Camera điện thoại quét mã QR chứa đường dẫn `/?room=CLP-XXX&mode=farmer`.
- **Giao diện chuyên biệt cho người lớn tuổi:**
  - Hiển thị 3 chỉ số khổng lồ: **Số bao cân được**, **Tổng ký tịnh**, **Tổng số tiền**.
  - Bảng liệt kê từng tờ (10 bao/tờ hoặc 20 bao/tờ) với ký hiệu to rõ.
  - Chế độ hiển thị ngoài trời (Outdoor Sun Mode) nền vàng đậm, chữ đen tuyền chống chói nắng gắt.
  - Đọc loa phát thanh qua Web Speech API mỗi khi có bao lúa mới được cân.

### 3.3 Hệ Thống Xác Thực & Quản Trị Thương Mại SaaS (`AuthModal.tsx`, `AdminUsersModal.tsx`)
- **Chế độ "Trải Nghiệm Nhanh (Demo)":** Nút bấm nổi bật giúp khách hàng dùng thử ngay lập tức một mẻ cân mẫu thực tế (150 bao, giống Đài Thơm 8, cọc 5 triệu) mà không cần điền form đăng ký.
- **Giải pháp đăng nhập không tốn phí SMS OTP:**
  - Chuyển đổi số điện thoại thành email ảo dạng: `${cleanPhoneNumber}@canluapro.local`.
  - Giúp thương lái đăng nhập an toàn qua Supabase Auth mà nhà phát triển không phải trả phí tích hợp SMS Brandname (vốn rất đắt đỏ tại Việt Nam).
- **Tài khoản Super Admin tích hợp sẵn:**
  - SĐT: `0393990638` | Mật khẩu khởi tạo: `CanluaPro@2026`
  - Đảm bảo Super Admin luôn có quyền truy cập quản trị cả khi chưa cấu hình Supabase Cloud.
- **Bảng điều khiển Quản trị viên (`AdminUsersModal`):**
  - Tìm kiếm khách hàng theo SĐT / Họ tên.
  - Phê duyệt tài khoản (`pending` -> `active`), khóa tài khoản (`blocked`).
  - Đổi quyền nhanh giữa `farmer`, `trader`, `admin`.
  - Đổi mật khẩu trực tiếp cho bất kỳ khách hàng nào mà không cần gửi OTP xác nhận.
  - Form tạo tài khoản chủ động cho thương lái mới.

### 3.4 Xuất Dữ Liệu & In Ấn Phần Cứng
- **Xuất File Excel Tối Ưu Mobile (`excelExport.ts`):**
  - Khống chế bảng cân lúa chi tiết trong 5 cột chuẩn (STT, Ký gộp, Trừ bì, Ký tịnh, Ghi chú/Tờ) với tổng bề rộng < 55 đơn vị, mở xem trọn vẹn trên Zalo/WPS/Excel điện thoại mà không cần cuộn ngang.
  - Cố định dòng tiêu đề (Freeze Panes từ dòng 8).
  - Sử dụng công thức động Excel (`SUM`, phép tính trừ cọc, trừ bốc vác).
- **In Hóa Đơn Nhiệt Mini Bluetooth Chuẩn ESC/POS (`escpos.ts`):**
  - Kết nối trực tiếp qua Web Bluetooth API (GATT Profile) không cần cài đặt driver.
  - Tự động cắt bỏ dấu tiếng Việt chuẩn bảng mã ASCII để không bị lỗi font trên các máy in nhiệt giá rẻ của Trung Quốc (Xprinter, PT-210, PeriPage, GOOJPRT...).
  - Hỗ trợ cả 2 khổ giấy thông dụng: 58mm (bỏ túi) và 80mm (để bàn).
  - Truyền dữ liệu dạng khối (Chunk size 100 bytes) với delay 25ms chống tràn bộ đệm máy in.
- **Xuất Ảnh Phiếu Cân & VietQR (`export.ts`, `VietQRModal.tsx`):**
  - Vẽ phiếu cân chất lượng cao trực tiếp bằng HTML5 Canvas và xuất file ảnh PNG gửi Zalo.
  - Sinh mã VietQR chuyển khoản theo tiêu chuẩn NAPAS 247 kèm số tiền chính xác và nội dung chuyển khoản tự động.

---

## 4. ĐIỂM NGHẼN KỸ THUẬT & YÊU CẦU CẦN TƯ VẤN
*(Phần dành riêng cho ChatGPT / Chuyên gia AI phân tích và đưa ra giải pháp kiến trúc tối ưu)*

### 4.1 Bài Toán 1: Bảo Mật API & Phân Quyền Cấp Cơ Sở Dữ Liệu (RLS Hardening)
- **Hiện trạng:** Bảng `profiles` đã có trường `status` ('pending', 'active', 'blocked') và Policy RLS. Tuy nhiên, bảng `rice_batches` hiện tại đang mở quyền `insert/update` cho mọi user authenticated để tạo sự tiện lợi ban đầu.
- **Câu hỏi tư vấn:**
  1. Cần viết lại Policy RLS cho `rice_batches` như thế nào để đảm bảo chỉ những tài khoản có `profiles.status = 'active'` mới được phép lưu trữ và phát sóng dữ liệu?
  2. Làm thế nào để ngăn chặn tình trạng người dùng dịch ngược JavaScript ở client để can thiệp vào `role` hoặc `status` mà không qua thanh toán?
  3. Có nên sử dụng Supabase Database Webhooks hoặc Edge Functions để kiểm tra thời hạn thuê bao định kỳ (ví dụ: gói dịch vụ theo vụ 90 ngày)?

### 4.2 Bài Toán 2: Độ Ổn Định WebSocket Ngoài Đồng Ruộng Khi Mạng 4G Nhảy Trạm
- **Hiện trạng:** Ngoài cánh đồng, điện thoại thường xuyên bị mất sóng hoặc nhảy giữa trạm 3G và 4G, dẫn đến kết nối WebSocket bị đứt (`CHANNEL_ERROR` hoặc `TIMED_OUT`). Hiện tại client đã có logic `setTimeout(setupChannel, 3000)` và lắng nghe sự kiện `window.online`.
- **Câu hỏi tư vấn:**
  1. Giải pháp nào để triển khai cơ chế **Exponential Backoff Reconnect** kết hợp với **Heartbeat Ping/Pong** tối ưu nhất cho Supabase Realtime?
  2. Khi mạng bị đứt trong 5 phút lúc thợ cân vẫn đang nhập 50 bao lúa, làm thế nào để khi có mạng lại, hệ thống tự động hòa giải dữ liệu (Reconciliation / Conflict Resolution) mà không làm mất số cân hoặc ghi đè sai lệch dữ liệu của máy nông dân?

### 4.3 Bài Toán 3: Chiến Lược Định Giá & Tự Động Hóa Kích Hoạt Gói SaaS
- **Đặc thù người dùng ĐBSCL:** Thương lái lúa phần lớn hoạt động theo vụ mùa (3 vụ/năm: Đông Xuân, Hè Thu, Thu Đông). Họ không quen trả phí dạng đăng ký thẻ tín dụng định kỳ hàng tháng (Stripe / Apple Pay không khả thi).
- **Câu hỏi tư vấn:**
  1. Đề xuất mô hình định giá SaaS tối ưu nhất:
     - Trả phí theo từng vụ lúa (ví dụ: 199.000 đ / vụ lúa 3 - 4 tháng)?
     - Trả phí theo năm (ví dụ: 499.000 đ / năm)?
     - Hay mô hình tính phí theo sản lượng tấn lúa / số mẻ cân?
  2. Kiến trúc tích hợp cổng thanh toán tự động tại Việt Nam: Giải pháp tích hợp Webhook qua **SePay** hoặc **Casso** với mã VietQR động để khi thương lái chuyển khoản đúng cú pháp, Supabase Edge Function tự động cập nhật `status = 'active'` ngay lập tức trong 3 giây mà Admin không cần thao tác thủ công.

### 4.4 Bài Toán 4: Tối Ưu UX Tốc Độ Cực Hạn Dưới Nắng Gắt
- **Hiện trạng:** Đã có Numpad công thái học, chế độ khóa hàng chục (Tens Lock 40, 50, 60kg) và bàn phím Speed Mode nhịp 3s/bao.
- **Câu hỏi tư vấn:**
  1. Cần bổ sung cơ chế phím tắt phần cứng nào (ví dụ: hỗ trợ bàn phím số cơ không dây Bluetooth rời) để thợ cân đeo găng tay hoặc tay dính bụi lúa vẫn gõ chuẩn xác 100%?
  2. Đề xuất giải pháp kết nối trực tiếp với đầu cân điện tử (Cân bàn điện tử Yaohua A12, XK3190...) qua Bluetooth SPP hoặc Web Serial API để tự động lấy số ký mà không cần con người bấm tay.

---

## 5. HƯỚNG DẪN CHẠY & KIỂM THỬ HỆ THỐNG

### 5.1 Cài Đặt Môi Trường
```bash
# Clone dự án từ GitHub
git clone https://github.com/dinhphuoctho79/canluapro.git
cd canluapro

# Cài đặt thư viện phụ thuộc (Node >= 22)
npm install

# Tạo file cấu hình môi trường .env tại thư mục gốc
VITE_SUPABASE_URL=https://qtcvmvveqrcrlupzhiod.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5.2 Khởi Chạy Và Kiểm Thử Build
```bash
# Chạy môi trường phát triển cục bộ (cổng 3000)
npm run dev

# Kiểm tra lỗi kiểu dữ liệu TypeScript
npm run lint

# Build bản đóng gói triển khai sản phẩm (Production)
npm run build
```

---
*Tài liệu được khởi tạo tự động bởi Antigravity Technical Lead Agent phục vụ bàn giao và đánh giá giải pháp SaaS Cân Lúa Pro.*
