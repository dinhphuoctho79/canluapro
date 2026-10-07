import * as XLSX from 'xlsx';
import { RiceBatch, RiceLot } from '../types';
import { readVietnameseMoney, readVietnameseWeight } from './numberToWords';

export function exportRiceBatchToExcel(batch: RiceBatch, allBatches: RiceBatch[] = []) {
  const wb = XLSX.utils.book_new();

  // ==========================================================================
  // SHEET 1: PHIẾU CÂN CHI TIẾT (TỐI ƯU 5 CỘT CHO MÀN HÌNH ĐIỆN THOẠI 400-450px)
  // ==========================================================================
  // Cấu trúc 5 cột:
  // Col A (0): STT (Width: 6)
  // Col B (1): Số kg gộp (Width: 14)
  // Col C (2): Trừ bì (Width: 10)
  // Col D (3): Ký tịnh (kg) (Width: 14)
  // Col E (4): Ghi chú / Tờ (Width: 11)
  // Tổng width: 55 đơn vị -> Vừa khít smartphone khi mở qua Zalo, WPS Office, Excel Mobile
  // ==========================================================================

  const sheet1Data: (string | number | { f: string })[][] = [];
  const merges: XLSX.Range[] = [];
  const rowHeights: { hpt?: number; hpx?: number }[] = [];

  // 1. Dòng 1: Tiêu đề chính (Gộp A1:E1)
  // Row 0 (index 0)
  sheet1Data.push(['BẢNG KÊ CÂN LÚA THU MUA & QUYẾT TOÁN', '', '', '', '']);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } });
  rowHeights.push({ hpt: 36 });

  // 2. Dòng 2: Subtitle Zalo / App (Gộp A2:E2)
  // Row 1 (index 1)
  sheet1Data.push(['HỆ THỐNG CÂN LÚA PRO • ZALO HỖ TRỢ: 039.399.0638', '', '', '', '']);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 4 } });
  rowHeights.push({ hpt: 18 });

  // 3. Khối thông tin khách hàng & mẻ cân (Dòng 3 - Dòng 6)
  // Row 2 (index 2) - Dòng 3
  sheet1Data.push([
    `Chủ ruộng: ${batch.farmerName || 'Chưa đặt tên'}`,
    '',
    '',
    `SĐT: ${batch.farmerPhone || 'Không có'}`,
    '',
  ]);
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });
  merges.push({ s: { r: 2, c: 3 }, e: { r: 2, c: 4 } });
  rowHeights.push({ hpt: 20 });

  // Row 3 (index 3) - Dòng 4
  const formattedPrice = (batch.pricePerKg || 0).toLocaleString('vi-VN');
  sheet1Data.push([
    `Giống lúa: ${batch.riceVariety || 'Lúa thường'}`,
    '',
    '',
    `Đơn giá: ${formattedPrice} đ/kg`,
    '',
  ]);
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 2 } });
  merges.push({ s: { r: 3, c: 3 }, e: { r: 3, c: 4 } });
  rowHeights.push({ hpt: 20 });

  // Row 4 (index 4) - Dòng 5
  const formattedDeposit = (batch.depositAmount || 0).toLocaleString('vi-VN');
  sheet1Data.push([
    `Quy cách: ${batch.bagsPerSheet || 10} bao/tờ`,
    '',
    '',
    `Tiền cọc: ${formattedDeposit} đ`,
    '',
  ]);
  merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 2 } });
  merges.push({ s: { r: 4, c: 3 }, e: { r: 4, c: 4 } });
  rowHeights.push({ hpt: 20 });

  // Row 5 (index 5) - Dòng 6: Mã mẻ & Ngày cân
  sheet1Data.push([
    `Mã mẻ: ${batch.code || 'CLP-01'}`,
    '',
    '',
    `Ngày cân: ${batch.date || new Date().toISOString().split('T')[0]}`,
    '',
  ]);
  merges.push({ s: { r: 5, c: 0 }, e: { r: 5, c: 2 } });
  merges.push({ s: { r: 5, c: 3 }, e: { r: 5, c: 4 } });
  rowHeights.push({ hpt: 20 });

  // Dòng 7 (index 6): Dòng trống phân cách
  sheet1Data.push(['', '', '', '', '']);
  rowHeights.push({ hpt: 8 });

  // 4. Dòng Header Bảng Cân (Row index 7 - Dòng 8 trong Excel)
  const headerRowIndex = 7;
  sheet1Data.push(['STT', 'Số kg gộp', 'Trừ bì', 'Ký tịnh (kg)', 'Ghi chú']);
  rowHeights.push({ hpt: 26 });

  // 5. Chuẩn hóa danh sách lô lúa & nạp dữ liệu chi tiết
  const lots: RiceLot[] =
    batch.lots && batch.lots.length > 0
      ? batch.lots
      : [
          {
            id: 'default',
            lotName: 'Lô lúa chính',
            riceVariety: batch.riceVariety,
            pricePerKg: batch.pricePerKg,
            tareWeightPerBag: batch.tareWeightPerBag,
            bags: batch.bags,
          },
        ];

  let totalBagsCount = 0;
  let totalGrossWeight = 0;
  let totalCalculatedTare = 0;
  let totalNetWeight = 0;

  // Mảng lưu các dòng bắt đầu và kết thúc của từng mẻ để viết công thức subtotal
  const bagRowIndices: number[] = [];

  lots.forEach((lot) => {
    if (lots.length > 1) {
      const lotHeaderIndex = sheet1Data.length;
      sheet1Data.push([`LÔ: ${lot.lotName || lot.riceVariety} (Giá: ${lot.pricePerKg} đ/kg)`, '', '', '', '']);
      merges.push({ s: { r: lotHeaderIndex, c: 0 }, e: { r: lotHeaderIndex, c: 4 } });
      rowHeights.push({ hpt: 22 });
    }

    const bags = lot.bags || [];
    const bagsPerSheet = batch.bagsPerSheet || 10;
    const totalSheets = Math.max(1, Math.ceil(bags.length / bagsPerSheet));

    for (let s = 1; s <= totalSheets; s++) {
      const startIdx = (s - 1) * bagsPerSheet;
      const sheetBags = bags.slice(startIdx, startIdx + bagsPerSheet);
      if (sheetBags.length === 0) continue;

      const sheetStartRow = sheet1Data.length + 1; // 1-based index in Excel formula
      let sheetGross = 0;
      let sheetTare = 0;
      let sheetNet = 0;

      sheetBags.forEach((bag) => {
        const currentDataRowIndex = sheet1Data.length;
        bagRowIndices.push(currentDataRowIndex + 1); // 1-based row number

        const tare = typeof lot.tareWeightPerBag === 'number' ? lot.tareWeightPerBag : 0.2;
        const net = Math.max(0, bag.weight - tare);

        sheetGross += bag.weight;
        sheetTare += tare;
        sheetNet += net;

        totalBagsCount++;
        totalGrossWeight += bag.weight;
        totalCalculatedTare += tare;
        totalNetWeight += net;

        // Cột A: STT, Cột B: Số kg gộp, Cột C: Trừ bì, Cột D: Ký tịnh (=B - C), Cột E: Tờ
        const excelRowNum = currentDataRowIndex + 1;
        sheet1Data.push([
          bag.bagIndex,
          Number(bag.weight.toFixed(1)),
          Number(tare.toFixed(1)),
          { f: `ROUND(B${excelRowNum}-C${excelRowNum}, 1)` },
          `Tờ ${s}`,
        ]);
        rowHeights.push({ hpt: 20 });
      });

      const sheetEndRow = sheet1Data.length; // 1-based row number
      const subtotalRowIndex = sheet1Data.length;

      // DÒNG CỘNG TỪNG TỜ (SUBTOTAL)
      sheet1Data.push([
        `TỔNG TỜ ${s}`,
        { f: `ROUND(SUM(B${sheetStartRow}:B${sheetEndRow}), 1)` },
        Number(sheetTare.toFixed(1)),
        { f: `ROUND(SUM(D${sheetStartRow}:D${sheetEndRow}), 1)` },
        `(${sheetBags.length} bao)`,
      ]);
      rowHeights.push({ hpt: 22 });
    }
  });

  // Flat tare nếu có cấu hình trừ dồn mẻ
  const flatTare = batch.flatTareAmount || 0;
  const finalTotalTare = flatTare > 0 ? flatTare : totalCalculatedTare;
  const finalNetWeight = Math.max(0, totalGrossWeight - finalTotalTare);

  // Phí bốc vác & người chi trả
  const porterFeePerBag = batch.porterFeePerBag ?? batch.porterageFeePerBag ?? 0;
  const totalPorterFee = totalBagsCount * porterFeePerBag;
  const porterPayer = batch.porterPayer ?? batch.porteragePayer ?? 'buyer';

  let finalPayout = Math.round(finalNetWeight * (batch.pricePerKg || 0)) - (batch.depositAmount || 0);
  if (porterPayer === 'farmer') {
    finalPayout -= totalPorterFee;
  } else if (porterPayer === 'split') {
    finalPayout -= Math.round(totalPorterFee / 2);
  }
  const isFarmerOwing = finalPayout < 0;

  // Dòng trống trước khối quyết toán
  sheet1Data.push(['', '', '', '', '']);
  rowHeights.push({ hpt: 10 });

  // ==========================================================================
  // 6. KHỐI QUYẾT TOÁN TÀI CHÍNH (THIẾT KẾ THẺ KPI NỔI BẬT DƯỚI CÙNG)
  // ==========================================================================
  // Tiêu đề khối
  const kpiTitleRowIndex = sheet1Data.length;
  sheet1Data.push(['QUYẾT TOÁN THANH TOÁN TIỀN LÚA', '', '', '', '']);
  merges.push({ s: { r: kpiTitleRowIndex, c: 0 }, e: { r: kpiTitleRowIndex, c: 4 } });
  rowHeights.push({ hpt: 28 });

  // 1. Tổng số bao: Gộp A:C, D: số bao, E: "bao"
  const rowBagsIndex = sheet1Data.length;
  sheet1Data.push(['Tổng số bao lúa:', '', '', totalBagsCount, 'bao']);
  merges.push({ s: { r: rowBagsIndex, c: 0 }, e: { r: rowBagsIndex, c: 2 } });
  rowHeights.push({ hpt: 22 });

  // 2. Tổng trọng lượng tịnh: Gộp A:C, D: số kg, E: "kg"
  const rowNetIndex = sheet1Data.length;
  sheet1Data.push(['Tổng trọng lượng tịnh:', '', '', Number(finalNetWeight.toFixed(1)), 'kg']);
  merges.push({ s: { r: rowNetIndex, c: 0 }, e: { r: rowNetIndex, c: 2 } });
  rowHeights.push({ hpt: 24 });

  // 3. Bằng chữ số ký: Gộp A:E
  const rowWordWeightIndex = sheet1Data.length;
  sheet1Data.push([`(Ký tịnh bằng chữ: ${readVietnameseWeight(finalNetWeight)})`, '', '', '', '']);
  merges.push({ s: { r: rowWordWeightIndex, c: 0 }, e: { r: rowWordWeightIndex, c: 4 } });
  rowHeights.push({ hpt: 19 });

  // 4. Thành tiền lúa: Gộp A:C ghi Tổng thành tiền, D:E ghi công thức =ROUND(D[rowNet]*Đơn_giá, 0)
  const excelNetRowNum = rowNetIndex + 1; // 1-based
  const priceVal = batch.pricePerKg || 0;
  const rowAmountIndex = sheet1Data.length;
  sheet1Data.push([
    'Tổng thành tiền lúa:',
    '',
    '',
    { f: `ROUND(D${excelNetRowNum}*${priceVal}, 0)` },
    '',
  ]);
  merges.push({ s: { r: rowAmountIndex, c: 0 }, e: { r: rowAmountIndex, c: 2 } });
  merges.push({ s: { r: rowAmountIndex, c: 3 }, e: { r: rowAmountIndex, c: 4 } });
  rowHeights.push({ hpt: 24 });

  // 5. Tiền cọc đã lấy trước
  const depositVal = batch.depositAmount || 0;
  const rowDepositIndex = sheet1Data.length;
  sheet1Data.push(['Trừ tiền cọc đã lấy trước:', '', '', -depositVal, '']);
  merges.push({ s: { r: rowDepositIndex, c: 0 }, e: { r: rowDepositIndex, c: 2 } });
  merges.push({ s: { r: rowDepositIndex, c: 3 }, e: { r: rowDepositIndex, c: 4 } });
  rowHeights.push({ hpt: 22 });

  // Tiền bốc vác (nếu nông dân chịu hoặc chia đôi)
  let farmerPorterDeduction = 0;
  if (totalPorterFee > 0 && porterPayer === 'farmer') {
    farmerPorterDeduction = totalPorterFee;
  } else if (totalPorterFee > 0 && porterPayer === 'split') {
    farmerPorterDeduction = Math.round(totalPorterFee / 2);
  }

  if (farmerPorterDeduction > 0) {
    const rowPorterIndex = sheet1Data.length;
    sheet1Data.push([
      `Trừ tiền vác lúa (${porterPayer === 'split' ? 'Chia đôi 50%' : 'Chủ ruộng chịu'}):`,
      '',
      '',
      -farmerPorterDeduction,
      '',
    ]);
    merges.push({ s: { r: rowPorterIndex, c: 0 }, e: { r: rowPorterIndex, c: 2 } });
    merges.push({ s: { r: rowPorterIndex, c: 3 }, e: { r: rowPorterIndex, c: 4 } });
    rowHeights.push({ hpt: 22 });
  }

  // 6. TIỀN CÒN LẠI PHẢI THANH TOÁN (HOẶC NÔNG DÂN CÒN THIẾU LẠI LÁI)
  const excelAmountRowNum = rowAmountIndex + 1;
  const rowFinalPayoutIndex = sheet1Data.length;
  const formulaPayout = `D${excelAmountRowNum}-${depositVal}${farmerPorterDeduction > 0 ? `-${farmerPorterDeduction}` : ''}`;

  if (isFarmerOwing) {
    sheet1Data.push([
      `NÔNG DÂN CÒN THIẾU LẠI LÁI:`,
      '',
      '',
      { f: formulaPayout },
      '',
    ]);
  } else {
    sheet1Data.push([
      `TIỀN CÒN LẠI TRẢ CHỦ RUỘNG:`,
      '',
      '',
      { f: formulaPayout },
      '',
    ]);
  }
  merges.push({ s: { r: rowFinalPayoutIndex, c: 0 }, e: { r: rowFinalPayoutIndex, c: 2 } });
  merges.push({ s: { r: rowFinalPayoutIndex, c: 3 }, e: { r: rowFinalPayoutIndex, c: 4 } });
  rowHeights.push({ hpt: 28 });

  // 7. Dòng bằng chữ số tiền
  const rowWordMoneyIndex = sheet1Data.length;
  const moneyInWords = isFarmerOwing
    ? `(Chủ ruộng còn thiếu lại thương lái: ${readVietnameseMoney(Math.abs(finalPayout)).toLowerCase()})`
    : `(Bằng chữ: ${readVietnameseMoney(finalPayout)})`;

  sheet1Data.push([moneyInWords, '', '', '', '']);
  merges.push({ s: { r: rowWordMoneyIndex, c: 0 }, e: { r: rowWordMoneyIndex, c: 4 } });
  rowHeights.push({ hpt: 22 });

  // Dòng trống
  sheet1Data.push(['', '', '', '', '']);
  rowHeights.push({ hpt: 12 });

  // ==========================================================================
  // 7. KHU VỰC KÝ TÊN VÀ CHÂN TRANG
  // ==========================================================================
  const rowSignHeaderIndex = sheet1Data.length;
  sheet1Data.push(['ĐẠI DIỆN CHỦ RUỘNG', '', 'THƯƠNG LÁI THU MUA', '', '']);
  merges.push({ s: { r: rowSignHeaderIndex, c: 0 }, e: { r: rowSignHeaderIndex, c: 1 } });
  merges.push({ s: { r: rowSignHeaderIndex, c: 2 }, e: { r: rowSignHeaderIndex, c: 4 } });
  rowHeights.push({ hpt: 20 });

  const rowSignSubIndex = sheet1Data.length;
  sheet1Data.push(['(Ký và ghi rõ họ tên)', '', '(Ký và ghi rõ họ tên)', '', '']);
  merges.push({ s: { r: rowSignSubIndex, c: 0 }, e: { r: rowSignSubIndex, c: 1 } });
  merges.push({ s: { r: rowSignSubIndex, c: 2 }, e: { r: rowSignSubIndex, c: 4 } });
  rowHeights.push({ hpt: 18 });

  // Khoảng trống ký tên cao tối thiểu 45pt
  sheet1Data.push(['', '', '', '', '']);
  rowHeights.push({ hpt: 48 });

  // Chân trang nguồn gốc
  const rowFooterIndex = sheet1Data.length;
  sheet1Data.push([
    'Phiếu cân xuất tự động từ Phần mềm Cân Lúa Pro • Tác giả: Nguyễn Công Dinh • Zalo: 039.399.0638',
    '',
    '',
    '',
    '',
  ]);
  merges.push({ s: { r: rowFooterIndex, c: 0 }, e: { r: rowFooterIndex, c: 4 } });
  rowHeights.push({ hpt: 22 });

  // Tạo Worksheet 1 từ AOA
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);

  // Gán bề rộng cột (Tổng cộng ~ 55 đơn vị, chuẩn điện thoại di động)
  ws1['!cols'] = [
    { wch: 6 },  // Cột A: STT
    { wch: 14 }, // Cột B: Số kg gộp
    { wch: 10 }, // Cột C: Trừ bì
    { wch: 14 }, // Cột D: Ký tịnh (kg)
    { wch: 11 }, // Cột E: Ghi chú / Tờ
  ];

  // Gán mảng Merge ô
  ws1['!merges'] = merges;

  // Gán chiều cao từng dòng
  ws1['!rows'] = rowHeights;

  // Cố định dòng tiêu đề (Freeze Panes ở Dòng 8)
  // Khi cuộn xuống hàng trăm bao lúa thì tiêu đề cột A8:E8 vẫn giữ nguyên
  ws1['!freeze'] = {
    xSplit: 0,
    ySplit: headerRowIndex + 1, // Freeze above row 9
    topLeftCell: `A${headerRowIndex + 2}`,
    state: 'frozen',
  };

  // Định dạng hiển thị số (Number Format) cho các ô tiền tệ và trọng lượng
  Object.keys(ws1).forEach((cellKey) => {
    if (cellKey.startsWith('!')) return;
    const cell = ws1[cellKey];
    if (cell && typeof cell === 'object') {
      const colLetter = cellKey.replace(/[0-9]/g, '');
      const rowNum = parseInt(cellKey.replace(/[^0-9]/g, ''), 10);

      // Định dạng số kg: 1 chữ số thập phân
      if ((colLetter === 'B' || colLetter === 'D') && rowNum > headerRowIndex + 1 && rowNum < kpiTitleRowIndex) {
        if (typeof cell.v === 'number') {
          cell.z = '#,##0.0';
        }
      }

      // Định dạng tiền tệ VND trong khối quyết toán
      if (rowNum >= rowAmountIndex + 1 && (colLetter === 'D' || colLetter === 'C')) {
        if (typeof cell.v === 'number' || cell.f) {
          cell.z = '#,##0 "đ"';
        }
      }
    }
  });

  XLSX.utils.book_append_sheet(wb, ws1, 'Phieu_Can_Pro');

  // ==========================================================================
  // SHEET 2: NHẬT KÝ MUA VỤ (TỔNG HỢP CÁC MẺ CÂN)
  // ==========================================================================
  const sheet2Data: (string | number)[][] = [];
  sheet2Data.push(['NHẬT KÝ THU MUA LÚA TOÀN VỤ - CÂN LÚA PRO', '', '', '', '', '', '', '', '', '', '', '']);
  sheet2Data.push(['Tác giả: Nguyễn Công Dinh • Hỗ trợ Zalo: 039.399.0638', '', '', '', '', '', '', '', '', '', '', '']);
  sheet2Data.push([]);
  sheet2Data.push([
    'STT',
    'Mã mẻ',
    'Ngày cân',
    'Chủ ruộng',
    'SĐT',
    'Giống lúa',
    'Số bao',
    'Ký tịnh (kg)',
    'Đơn giá (đ)',
    'Thành tiền (đ)',
    'Tiền cọc (đ)',
    'Còn lại (đ)',
  ]);

  const listToExport = allBatches.length > 0 ? allBatches : [batch];
  let totalAllBags = 0;
  let totalAllNet = 0;
  let totalAllAmount = 0;
  let totalAllDeposit = 0;
  let totalAllPayout = 0;

  listToExport.forEach((b, idx) => {
    let bBags = 0;
    let bNet = 0;
    let bAmount = 0;
    const bLots =
      b.lots && b.lots.length > 0
        ? b.lots
        : [
            {
              bags: b.bags,
              tareWeightPerBag: b.tareWeightPerBag,
              pricePerKg: b.pricePerKg,
            },
          ];

    bLots.forEach((l) => {
      const count = l.bags.length;
      const gross = l.bags.reduce((s, x) => s + x.weight, 0);
      const tare = count * (typeof l.tareWeightPerBag === 'number' ? l.tareWeightPerBag : (b.tareWeightPerBag ?? 0.2));
      const net = Math.max(0, gross - tare);
      const lotPrice = Number(l.pricePerKg) > 0 ? Number(l.pricePerKg) : (Number(b.pricePerKg) > 0 ? Number(b.pricePerKg) : 0);
      const amt = Math.round(net * lotPrice);

      bBags += count;
      bNet += net;
      bAmount += amt;
    });

    const bDeposit = b.depositAmount || 0;
    const bPorterage = (b.porterFeePerBag ?? b.porterageFeePerBag ?? 0) * bBags;
    let bPayout = bAmount - bDeposit;
    if ((b.porterPayer ?? b.porteragePayer ?? 'buyer') === 'farmer') {
      bPayout -= bPorterage;
    }

    totalAllBags += bBags;
    totalAllNet += bNet;
    totalAllAmount += bAmount;
    totalAllDeposit += bDeposit;
    totalAllPayout += bPayout;

    sheet2Data.push([
      idx + 1,
      b.code,
      b.date,
      b.farmerName || 'Chưa đặt',
      b.farmerPhone || '',
      b.riceVariety || '',
      bBags,
      Number(bNet.toFixed(1)),
      b.pricePerKg || 0,
      bAmount,
      bDeposit,
      bPayout,
    ]);
  });

  sheet2Data.push([]);
  sheet2Data.push([
    'TỔNG CỘNG TOÀN VỤ',
    '',
    '',
    '',
    '',
    '',
    totalAllBags,
    Number(totalAllNet.toFixed(1)),
    '',
    totalAllAmount,
    totalAllDeposit,
    totalAllPayout,
  ]);

  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);
  ws2['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } },
    { s: { r: sheet2Data.length - 1, c: 0 }, e: { r: sheet2Data.length - 1, c: 5 } },
  ];
  ws2['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 12 },
    { wch: 22 },
    { wch: 14 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Nhat_Ky_Toan_Vu');

  // Đặt tên file xuất: PhieuCanPro_[Ten_Chu_Ruong]_[Ngay].xlsx
  const cleanName = (batch.farmerName || 'ChuRuong')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');

  const filename = `PhieuCanPro_${cleanName || 'ChuRuong'}_${batch.date || '2026'}.xlsx`;
  XLSX.writeFile(wb, filename);
}
