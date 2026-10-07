export interface BagEntry {
  id: string;
  bagIndex: number; // 1, 2, 3...
  weight: number; // e.g. 50.4
  timestamp: number;
}

export interface RiceLot {
  id: string;
  lotName: string; // e.g. "Lô 1"
  riceVariety: string; // e.g. "Đài Thơm 8"
  pricePerKg: number; // Đơn giá đ/kg
  tareWeightPerBag: number; // Trừ bao bì (kg/bao, mặc định 0.2)
  flatTareAmount?: number; // Trừ khoán cả lô (kg cố định)
  bags: BagEntry[];
}

export interface RiceBatch {
  id: string;
  code: string; // Mã mẻ cân: e.g. CLP-20261006-01
  date: string; // e.g. 2026-10-06
  farmerName: string; // Tên chủ ruộng / Nông dân
  farmerPhone?: string; // SĐT chủ ruộng
  farmerBankName?: string; // Tên ngân hàng chủ ruộng
  farmerBankNumber?: string; // Số tài khoản chủ ruộng

  // Giai đoạn Coi đồng & Diện tích
  fieldAreaCong?: number;        // Diện tích ruộng: Số công (VD: 100 công)
  harvestDate?: string;          // Ngày định cắt lúa
  depositPerCong?: number;       // Cọc tính theo công (VD: 1.500.000 đ/công)
  depositAmount: number;         // Tổng tiền cọc đã ứng (VNĐ)
  seedDebtAmount?: number;       // Tiền nợ lúa giống / vật tư đầu vụ cấn trừ (VNĐ)

  // Cò lúa (Môi giới dắt mối) & Bán giống
  brokerName?: string;          // Tên cò lúa
  brokerPhone?: string;         // SĐT cò lúa
  brokerFeeType?: 'per_cong' | 'per_kg' | 'per_bag'; // Loại tính hoa hồng cò
  brokerFeePerCong?: number;    // Hoa hồng cò tính theo công (đ/công)
  brokerFeePerKg?: number;      // Hoa hồng cò tính theo kg (đ/kg)
  brokerFeePerBag?: number;     // Hoa hồng cò tính theo bao

  // Bốc vác
  porterFeePerBag: number;      // Đơn giá bốc vác (đ/bao)
  porterPayer: 'buyer' | 'farmer' | 'split'; // Ai trả: Thương lái, Nông dân, hay Chia đôi
  porterTeamLeader?: string;    // Tên tổ trưởng đội vác

  // Vận chuyển
  transportType: 'boat' | 'truck'; // Ghe đường thủy hoặc Xe tải đường bộ
  vehicleNumber?: string;       // Số hiệu ghe hoặc Biển số xe tải
  driverName?: string;          // Tên tài công hoặc tài xế
  destinationMill?: string;     // Tên lò sấy / nhà máy đến

  // Kèo lúa
  riceVariety: string; // Giống lúa mặc định
  pricePerKg: number; // Đơn giá đ/kg mặc định
  tareWeightPerBag: number; // Trừ bao bì (kg/bao, mặc định 0.2)
  flatTareAmount?: number; // Trừ khoán cả mẻ (kg cố định)
  bagsPerSheet: number; // 10 hoặc 20 bao/tờ
  weighingMode: 'nhon_hoa' | 'bluetooth'; // Chế độ Cân Nhơn Hòa hoặc Cân Bluetooth
  bags: BagEntry[]; // Danh sách bao (cho lô chính hoặc mẻ đơn)

  // Quản lý nhiều giống lúa trong cùng mẻ cân (Sub-batches / Sub-lots)
  lots?: RiceLot[]; // Danh sách các lô lúa con
  activeLotId?: string; // ID của lô lúa đang cân hiện tại

  // Legacy fields fallback
  porterageFeePerBag?: number;
  porteragePayer?: 'buyer' | 'farmer' | 'split';

  createdAt: number;
  updatedAt: number;
  isPaid?: boolean;
}

export type NumpadMode = 'full' | 'speed_lock';
export type TensLockValue = 40 | 50 | 60;

export interface BankItem {
  id: string;
  code: string;
  name: string;
  shortName: string;
  bin: string;
}
