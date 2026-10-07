import * as XLSX from 'xlsx';
import { RiceBatch, RiceLot } from '../types';
import { formatVND } from './export';
import { readVietnameseMoney, readVietnameseWeight } from './numberToWords';

export function exportRiceBatchToExcel(batch: RiceBatch, allBatches: RiceBatch[] = []) {
  const wb = XLSX.utils.book_new();

  // --- SHEET 1: Phieu_Can_Chi_Tiet ---
  const sheet1Data: (string | number)[][] = [];

  // Title
  sheet1Data.push(['BẢNG KÊ CÂN LÚA THU MUA & QUYẾT TOÁN TÀI CHÍNH - CÂN LÚA PRO']);
  sheet1Data.push([`Mã mẻ cân: ${batch.code}`, `Ngày cân: ${batch.date}`]);
  sheet1Data.push([`Chủ ruộng: ${batch.farmerName || 'Chưa đặt tên'}`, `Số điện thoại: ${batch.farmerPhone || 'Không có'}`]);
  sheet1Data.push([`Giống lúa: ${batch.riceVariety}`, `Đơn giá: ${batch.pricePerKg} đ/kg`]);
  sheet1Data.push([`Quy cách tờ: ${batch.bagsPerSheet} bao/tờ`, `Trừ vỏ bao bì: ${batch.tareWeightPerBag} kg/bao`]);
  sheet1Data.push([`Tiền cọc đã ứng: ${batch.depositAmount || 0} VNĐ`]);
  sheet1Data.push([]); // Empty row

  // Table header
  sheet1Data.push(['STT Bao', 'Khối lượng gộp (kg)', 'Trừ bì (kg)', 'Khối lượng tịnh (kg)', 'Tờ cân', 'Trạng thái']);

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

  let grandTotalBags = 0;
  let grandGrossWeight = 0;
  let grandTotalTare = 0;
  let grandNetWeight = 0;
  let grandTotalAmount = 0;

  lots.forEach((lot) => {
    if (lots.length > 1) {
      sheet1Data.push([`--- LÔ: ${lot.lotName || lot.riceVariety} (Đơn giá: ${lot.pricePerKg} đ/kg) ---`]);
    }

    const bags = lot.bags;
    const bagsPerSheet = batch.bagsPerSheet || 10;
    const totalSheets = Math.max(1, Math.ceil(bags.length / bagsPerSheet));

    for (let s = 1; s <= totalSheets; s++) {
      const startIdx = (s - 1) * bagsPerSheet;
      const sheetBags = bags.slice(startIdx, startIdx + bagsPerSheet);
      if (sheetBags.length === 0) continue;

      let sheetGross = 0;
      sheetBags.forEach((bag) => {
        const tare = lot.tareWeightPerBag;
        const net = Math.max(0, bag.weight - tare);
        const amount = Math.round(net * lot.pricePerKg);

        sheetGross += bag.weight;
        grandTotalBags++;
        grandGrossWeight += bag.weight;
        grandTotalTare += tare;
        grandNetWeight += net;
        grandTotalAmount += amount;

        sheet1Data.push([
          bag.bagIndex,
          Number(bag.weight.toFixed(1)),
          Number(tare.toFixed(1)),
          Number(net.toFixed(1)),
          `Tờ ${s}`,
          'Đã cân',
        ]);
      });

      // Subtotal for sheet
      const sheetTare = sheetBags.length * lot.tareWeightPerBag;
      const sheetNet = Math.max(0, sheetGross - sheetTare);
      sheet1Data.push([
        `CỘNG TỜ ${s}`,
        Number(sheetGross.toFixed(1)),
        Number(sheetTare.toFixed(1)),
        Number(sheetNet.toFixed(1)),
        `Tờ ${s}`,
        `(${sheetBags.length} bao)`,
      ]);
    }
  });

  const porterageFeePerBag = batch.porterageFeePerBag || 0;
  const totalPorterageFee = grandTotalBags * porterageFeePerBag;
  const porteragePayer = batch.porteragePayer || 'buyer';

  let finalPayout = grandTotalAmount - (batch.depositAmount || 0);
  if (porteragePayer === 'farmer') {
    finalPayout -= totalPorterageFee;
  }
  finalPayout = Math.max(0, finalPayout);

  sheet1Data.push([]);
  sheet1Data.push(['--- BẢNG QUYẾT TOÁN TÀI CHÍNH ---']);
  sheet1Data.push(['Tổng số bao lúa:', grandTotalBags, 'bao']);
  sheet1Data.push(['Tổng khối lượng gộp:', Number(grandGrossWeight.toFixed(1)), 'kg']);
  sheet1Data.push(['Tổng trừ bì vỏ bao:', Number(grandTotalTare.toFixed(1)), 'kg']);
  sheet1Data.push(['Trọng lượng tịnh thanh toán:', Number(grandNetWeight.toFixed(1)), 'kg']);
  sheet1Data.push(['Ký tịnh bằng chữ:', readVietnameseWeight(grandNetWeight)]);
  sheet1Data.push(['Đơn giá thu mua bình quân:', batch.pricePerKg, 'đ/kg']);
  sheet1Data.push(['TỔNG THÀNH TIỀN LÚA:', grandTotalAmount, 'VNĐ']);
  sheet1Data.push(['Tiền cọc đã ứng trước:', -(batch.depositAmount || 0), 'VNĐ']);
  if (totalPorterageFee > 0) {
    sheet1Data.push([
      `Tiền bốc vác (${grandTotalBags} bao x ${formatVND(porterageFeePerBag)}/bao):`,
      porteragePayer === 'farmer' ? -totalPorterageFee : totalPorterageFee,
      porteragePayer === 'farmer' ? 'VNĐ (Nông dân chịu)' : 'VNĐ (Thương lái chi riêng)',
    ]);
  }
  sheet1Data.push(['TIỀN CÒN LẠI PHẢI THANH TOÁN:', finalPayout, 'VNĐ']);
  sheet1Data.push(['Tiền thanh toán bằng chữ:', readVietnameseMoney(finalPayout)]);
  sheet1Data.push([]);
  sheet1Data.push(['Phần mềm Cân Lúa Pro • Tác giả: Nguyễn Công Dinh (Cần Thơ) • Zalo: 039.399.0638']);
  sheet1Data.push([]);
  sheet1Data.push(['Xác nhận của Chủ ruộng', '', '', 'Xác nhận của Thương lái']);
  sheet1Data.push(['(Ký và ghi rõ họ tên)', '', '', '(Ký và ghi rõ họ tên)']);

  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  ws1['!cols'] = [
    { wch: 12 },
    { wch: 22 },
    { wch: 15 },
    { wch: 22 },
    { wch: 12 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Phieu_Can_Chi_Tiet');

  // --- SHEET 2: Nhat_Ky_Mua_Vu ---
  const sheet2Data: (string | number)[][] = [];
  sheet2Data.push(['NHẬT KÝ MUA VỤ - CÂN LÚA PRO']);
  sheet2Data.push([]);
  sheet2Data.push([
    'STT',
    'Mã mẻ',
    'Ngày cân',
    'Tên chủ ruộng',
    'Số điện thoại',
    'Giống lúa',
    'Số bao',
    'Ký tịnh (kg)',
    'Đơn giá (đ)',
    'Thành tiền (đ)',
    'Tiền cọc (đ)',
    'Còn lại trả dân (đ)',
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
      const tare = count * l.tareWeightPerBag;
      const net = Math.max(0, gross - tare);
      const amt = Math.round(net * l.pricePerKg);

      bBags += count;
      bNet += net;
      bAmount += amt;
    });

    const bDeposit = b.depositAmount || 0;
    const bPorterage = (b.porterageFeePerBag || 0) * bBags;
    let bPayout = bAmount - bDeposit;
    if ((b.porteragePayer || 'buyer') === 'farmer') {
      bPayout -= bPorterage;
    }
    bPayout = Math.max(0, bPayout);

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
      b.riceVariety,
      bBags,
      Number(bNet.toFixed(1)),
      b.pricePerKg,
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
  ws2['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 12 },
    { wch: 22 },
    { wch: 15 },
    { wch: 18 },
    { wch: 10 },
    { wch: 15 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws2, 'Nhat_Ky_Mua_Vu');

  const cleanName = (batch.farmerName || 'ChuRuong').replace(/\s+/g, '_');
  const filename = `PhieuCanPro_${cleanName}_${batch.date}.xlsx`;
  XLSX.writeFile(wb, filename);
}
