import { RiceBatch, RiceLot } from '../types';
import { readVietnameseMoney, readVietnameseWeight } from './numberToWords';

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number, decimals: number = 1): string {
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

function getLots(batch: RiceBatch): RiceLot[] {
  const fallbackPrice = Number(batch.pricePerKg) > 0 ? Number(batch.pricePerKg) : 0;
  const fallbackTare = typeof batch.tareWeightPerBag === 'number' ? batch.tareWeightPerBag : 0.2;

  if (batch.lots && batch.lots.length > 0) {
    return batch.lots.map((lot, idx) => ({
      ...lot,
      pricePerKg: Number(lot.pricePerKg) > 0 ? Number(lot.pricePerKg) : fallbackPrice,
      tareWeightPerBag: typeof lot.tareWeightPerBag === 'number' ? lot.tareWeightPerBag : fallbackTare,
      lotName: lot.lotName || `Lô ${idx + 1}`,
      riceVariety: lot.riceVariety || batch.riceVariety || 'Lúa',
      bags: lot.bags || [],
    }));
  }

  return [
    {
      id: 'default',
      lotName: 'Lô lúa chính',
      riceVariety: batch.riceVariety || 'Lúa',
      pricePerKg: fallbackPrice,
      tareWeightPerBag: fallbackTare,
      bags: batch.bags || [],
    },
  ];
}

// Generate structured text message to send directly via Zalo
export function generateZaloTextMessage(batch: RiceBatch): string {
  const lots = getLots(batch);
  const defaultBatchPrice = Number(batch.pricePerKg) > 0 ? Number(batch.pricePerKg) : 0;

  let grandTotalBags = 0;
  let grandGrossWeight = 0;
  let calculatedBagTare = 0;

  const lotMetrics = lots.map((lot) => {
    const lotBags = lot.bags || [];
    const lotBagCount = lotBags.length;
    const lotGross = lotBags.reduce((s, b) => s + b.weight, 0);
    const lotTare = lotBagCount * (typeof lot.tareWeightPerBag === 'number' ? lot.tareWeightPerBag : 0.2);
    grandTotalBags += lotBagCount;
    grandGrossWeight += lotGross;
    calculatedBagTare += lotTare;
    return { lot, lotBagCount, lotGross, lotTare };
  });

  const flatTare = batch.flatTareAmount || 0;
  const grandTotalTare = flatTare > 0 ? flatTare : calculatedBagTare;
  const grandNetWeight = Math.max(0, grandGrossWeight - grandTotalTare);

  let grandTotalAmount = 0;
  const lotsFinal = lotMetrics.map((item) => {
    const lotShare = grandGrossWeight > 0 ? item.lotGross / grandGrossWeight : 1;
    const lotTare = flatTare > 0 ? flatTare * lotShare : item.lotTare;
    const lotNet = Math.max(0, item.lotGross - lotTare);
    const activePrice = Number(item.lot.pricePerKg) > 0 ? Number(item.lot.pricePerKg) : defaultBatchPrice;
    const lotAmount = Math.round(lotNet * activePrice);
    grandTotalAmount += lotAmount;
    return { ...item, lotTare, lotNet, lotAmount, activePrice };
  });

  let text = `🌾 PHIẾU CÂN LÚA PRO 🌾\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `👤 Chủ ruộng: ${batch.farmerName || 'Chưa đặt tên'}\n`;
  if (batch.farmerPhone) text += `📞 SĐT: ${batch.farmerPhone}\n`;
  text += `📅 Ngày cân: ${batch.date}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;

  lots.forEach((lot, idx) => {
    const finalItem = lotsFinal[idx];
    const lotBags = lot.bags || [];
    const lotBagCount = finalItem.lotBagCount;
    const lotNet = finalItem.lotNet;
    const lotAmount = finalItem.lotAmount;
    const activePrice = finalItem.activePrice;

    if (lots.length > 1) {
      text += `📦 LÔ ${idx + 1}: ${lot.lotName || lot.riceVariety}\n`;
      text += `   • Giống: ${lot.riceVariety} | Đơn giá: ${formatVND(activePrice)}/kg | Trừ bao: ${flatTare > 0 ? 'Trừ khoán' : `${lot.tareWeightPerBag}kg`}\n`;
    } else {
      text += `🌾 Giống lúa: ${lot.riceVariety}\n`;
      text += `💵 Đơn giá: ${formatVND(activePrice)}/kg\n`;
      text += `⚖️ Trừ bao bì: ${flatTare > 0 ? `Trừ khoán ${flatTare} kg` : `${lot.tareWeightPerBag} kg/bao`}\n`;
    }

    // Group sheets in this lot
    const bagsPerSheet = batch.bagsPerSheet || 10;
    const sheetsCount = Math.max(1, Math.ceil(lotBags.length / bagsPerSheet));
    for (let s = 1; s <= sheetsCount; s++) {
      const startIndex = (s - 1) * bagsPerSheet;
      const sheetBags = lotBags.slice(startIndex, startIndex + bagsPerSheet);
      if (sheetBags.length === 0) continue;
      const sheetGross = sheetBags.reduce((acc, b) => acc + b.weight, 0);
      const weightsList = sheetBags.map((b) => b.weight.toFixed(1)).join(' - ');
      text += `   🔹 Tờ ${s} (${sheetBags.length} bao): ${sheetGross.toFixed(1)} kg\n`;
      text += `      [ ${weightsList} ]\n`;
    }

    if (lots.length > 1) {
      text += `   👉 Tổng lô ${idx + 1}: ${lotBagCount} bao | Ký tịnh: ${formatNumber(lotNet)} kg = ${formatVND(lotAmount)}\n`;
    }
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  });

  const porterageFeePerBag = batch.porterFeePerBag ?? batch.porterageFeePerBag ?? 0;
  const totalPorterageFee = grandTotalBags * porterageFeePerBag;
  const porteragePayer = batch.porterPayer ?? batch.porteragePayer ?? 'buyer';

  let finalPayout = grandTotalAmount - (batch.depositAmount || 0);
  if (porteragePayer === 'farmer') {
    finalPayout -= totalPorterageFee;
  } else if (porteragePayer === 'split') {
    finalPayout -= Math.round(totalPorterageFee / 2);
  }
  const isFarmerOwing = finalPayout < 0;

  text += `📊 TỔNG KẾT THANH TOÁN:\n`;
  text += `• Tổng số bao: ${grandTotalBags} bao\n`;
  text += `• Tổng ký gộp: ${formatNumber(grandGrossWeight)} kg\n`;
  text += `• Trừ bao bì: -${formatNumber(grandTotalTare)} kg\n`;
  text += `• KÝ TỊNH: ${formatNumber(grandNetWeight)} kg\n`;
  text += `• Ký tịnh bằng chữ: ${readVietnameseWeight(grandNetWeight)}\n`;
  text += `• Tổng thành tiền: ${formatVND(grandTotalAmount)}\n`;
  if ((batch.depositAmount || 0) > 0) {
    text += `• Tiền cọc đã ứng: -${formatVND(batch.depositAmount || 0)}\n`;
  }
  if (totalPorterageFee > 0) {
    if (porteragePayer === 'farmer') {
      text += `• Tiền bốc vác (${grandTotalBags} bao x ${formatVND(porterageFeePerBag)}/bao): -${formatVND(totalPorterageFee)} (nông dân chịu)\n`;
    } else if (porteragePayer === 'split') {
      text += `• Tiền bốc vác (${grandTotalBags} bao x ${formatVND(porterageFeePerBag)}/bao): -${formatVND(totalPorterageFee / 2)} (chia đôi 50%)\n`;
    } else {
      text += `• Tiền bốc vác (${grandTotalBags} bao x ${formatVND(porterageFeePerBag)}/bao): ${formatVND(totalPorterageFee)} (thương lái chi riêng)\n`;
    }
  }

  if (isFarmerOwing) {
    text += `⚠️ NÔNG DÂN CÒN THIẾU LẠI LÁI: -${formatVND(Math.abs(finalPayout))}\n`;
    text += `👉 Bằng chữ: Chủ ruộng còn thiếu lại thương lái ${readVietnameseMoney(Math.abs(finalPayout)).toLowerCase()}\n`;
  } else {
    text += `👉 CÒN LẠI TRẢ NÔNG DÂN: ${formatVND(finalPayout)}\n`;
    text += `👉 Tiền thanh toán bằng chữ: ${readVietnameseMoney(finalPayout)}\n`;
  }
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Phần mềm Cân Lúa Pro • Tác giả: Nguyễn Công Dinh (Cần Thơ) • Zalo: 039.399.0638`;

  return text;
}

// Generate CSV string with UTF-8 BOM for Microsoft Excel compatibility
export function generateCSV(batch: RiceBatch): string {
  const lots = getLots(batch);

  let grandTotalBags = 0;
  let grandGrossWeight = 0;
  let grandTotalTare = 0;
  let grandNetWeight = 0;
  let grandTotalAmount = 0;

  let csv = '\uFEFF'; // UTF-8 BOM
  csv += `"BẢNG KÊ CHI TIẾT CÂN LÚA PRO"\n`;
  csv += `"Mã mẻ cân:","${batch.code}"\n`;
  csv += `"Chủ ruộng:","${batch.farmerName}"\n`;
  csv += `"Số điện thoại:","${batch.farmerPhone || ''}"\n`;
  csv += `"Ngày cân:","${batch.date}"\n`;
  csv += `"Quy cách tờ:",${batch.bagsPerSheet} bao/tờ\n`;
  csv += `\n`;

  // Headers
  csv += `"STT","Lô lúa","Tờ số","Trọng lượng gộp (kg)","Trừ bao (kg)","Trọng lượng tịnh (kg)","Đơn giá (đ)","Thành tiền (đ)"\n`;

  const defaultPrice = Number(batch.pricePerKg) > 0 ? Number(batch.pricePerKg) : 0;
  const bagsPerSheet = batch.bagsPerSheet || 10;

  lots.forEach((lot) => {
    const lotBags = lot.bags || [];
    const activeLotPrice = Number(lot.pricePerKg) > 0 ? Number(lot.pricePerKg) : defaultPrice;
    const tarePerBag = typeof lot.tareWeightPerBag === 'number' ? lot.tareWeightPerBag : 0.2;

    lotBags.forEach((bag, idx) => {
      const sheetNum = Math.floor(idx / bagsPerSheet) + 1;
      const tare = tarePerBag;
      const net = Math.max(0, bag.weight - tare);
      const amount = Math.round(net * activeLotPrice);

      grandTotalBags++;
      grandGrossWeight += bag.weight;
      grandTotalTare += tare;
      grandNetWeight += net;
      grandTotalAmount += amount;

      csv += `${bag.bagIndex},"${lot.lotName || lot.riceVariety}",${sheetNum},${bag.weight.toFixed(1)},${tare.toFixed(1)},${net.toFixed(1)},${activeLotPrice},${amount}\n`;
    });
  });

  const porterageFeePerBag = batch.porterFeePerBag ?? batch.porterageFeePerBag ?? 0;
  const totalPorterageFee = grandTotalBags * porterageFeePerBag;
  const porteragePayer = batch.porterPayer ?? batch.porteragePayer ?? 'buyer';

  let finalPayout = grandTotalAmount - (batch.depositAmount || 0);
  if (porteragePayer === 'farmer') {
    finalPayout -= totalPorterageFee;
  } else if (porteragePayer === 'split') {
    finalPayout -= Math.round(totalPorterageFee / 2);
  }
  const isFarmerOwing = finalPayout < 0;

  csv += `\n`;
  csv += `"TỔNG CỘNG:","${grandTotalBags} bao",,${grandGrossWeight.toFixed(1)},${grandTotalTare.toFixed(1)},${grandNetWeight.toFixed(1)},,${grandTotalAmount}\n`;
  csv += `"TIỀN CỌC ĐÃ ỨNG:","","","","","",,"-${batch.depositAmount || 0}"\n`;
  if (totalPorterageFee > 0) {
    csv += `"TIỀN BỐC VÁC (${porteragePayer === 'farmer' ? 'Dân chịu' : porteragePayer === 'split' ? 'Chia đôi 50%' : 'Lái chịu'}):","","","","","",,"${porteragePayer === 'farmer' ? `-${totalPorterageFee}` : porteragePayer === 'split' ? `-${Math.round(totalPorterageFee / 2)}` : totalPorterageFee}"\n`;
  }
  csv += `"${isFarmerOwing ? 'NÔNG DÂN CÒN THIẾU LẠI LÁI' : 'THỰC TRẢ NÔNG DÂN'}:","","","","","",,"${isFarmerOwing ? -Math.abs(finalPayout) : finalPayout}"\n`;
  csv += `"GHI CHÚ:","Phần mềm Cân Lúa Pro - Nhanh chóng • Chuẩn xác • Minh bạch"\n`;

  return csv;
}

export function downloadCSV(batch: RiceBatch) {
  const csvContent = generateCSV(batch);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanName = (batch.farmerName || 'ChuRuong').replace(/\s+/g, '_');
  const filename = `PhieuCanPro_${cleanName}_${batch.date}.csv`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Generate Canvas Image of the weighing receipt for photo sharing on Zalo / Messenger
export async function generateReceiptImage(batch: RiceBatch): Promise<string> {
  const lots = getLots(batch);
  const width = 800;
  const padding = 36;

  let totalBagsCount = 0;
  let totalSheetsCount = 0;
  lots.forEach((l) => {
    totalBagsCount += l.bags.length;
    totalSheetsCount += Math.max(1, Math.ceil(l.bags.length / batch.bagsPerSheet));
  });

  const baseHeight = 610;
  const sheetsHeight = totalSheetsCount * 105 + lots.length * 40;
  const totalHeight = baseHeight + sheetsHeight;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, totalHeight);

  // Top header bar (Emerald Rice Green)
  ctx.fillStyle = '#059669';
  ctx.fillRect(0, 0, width, 110);

  // Header Title: CÂN LÚA PRO
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🌾 PHIẾU CÂN LÚA PRO 🌾', width / 2, 48);

  ctx.font = '14px sans-serif';
  ctx.fillStyle = '#D1FAE5';
  ctx.fillText('Phần mềm Cân Lúa Pro - Nhanh chóng • Chuẩn xác • Minh bạch', width / 2, 80);

  // Info Box
  let y = 140;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(padding, y, width - padding * 2, 100);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1;
  ctx.strokeRect(padding, y, width - padding * 2, 100);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1E293B';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`Chủ ruộng: ${batch.farmerName || 'Chưa đặt tên'}`, padding + 16, y + 36);
  if (batch.farmerPhone) {
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`SĐT: ${batch.farmerPhone}`, padding + 16, y + 68);
  }

  ctx.textAlign = 'right';
  ctx.fillStyle = '#475569';
  ctx.font = '15px sans-serif';
  ctx.fillText(`Ngày cân: ${batch.date}`, width - padding - 16, y + 36);
  ctx.fillText(`Mã phiếu: ${batch.code}  (${batch.bagsPerSheet} bao/tờ)`, width - padding - 16, y + 68);

  y += 125;

  let grandTotalBags = 0;
  let grandGrossWeight = 0;
  let calculatedBagTare = 0;

  const lotMetrics = lots.map((lot) => {
    const lotBags = lot.bags;
    const lotBagCount = lotBags.length;
    const lotGross = lotBags.reduce((acc, b) => acc + b.weight, 0);
    const lotTare = lotBagCount * (lot.tareWeightPerBag ?? batch.tareWeightPerBag ?? 0.2);
    grandTotalBags += lotBagCount;
    grandGrossWeight += lotGross;
    calculatedBagTare += lotTare;
    return { lot, lotBagCount, lotGross, lotTare };
  });

  const flatTare = batch.flatTareAmount || 0;
  const grandTotalTare = flatTare > 0 ? flatTare : calculatedBagTare;
  const grandNetWeight = Math.max(0, grandGrossWeight - grandTotalTare);

  let grandTotalAmount = 0;
  const lotsFinal = lotMetrics.map((item) => {
    const lotShare = grandGrossWeight > 0 ? item.lotGross / grandGrossWeight : 1;
    const lotTare = flatTare > 0 ? flatTare * lotShare : item.lotTare;
    const lotNet = Math.max(0, item.lotGross - lotTare);
    const activePrice = Number(item.lot.pricePerKg) > 0 ? Number(item.lot.pricePerKg) : (Number(batch.pricePerKg) > 0 ? Number(batch.pricePerKg) : 0);
    const lotAmount = Math.round(lotNet * activePrice);
    grandTotalAmount += lotAmount;
    return { ...item, lotTare, lotNet, lotAmount, activePrice };
  });

  lots.forEach((lot, lotIdx) => {
    const finalItem = lotsFinal[lotIdx];
    const lotBags = lot.bags;
    const lotBagCount = finalItem.lotBagCount;
    const lotGross = finalItem.lotGross;
    const lotTare = finalItem.lotTare;
    const lotNet = finalItem.lotNet;
    const lotAmount = finalItem.lotAmount;
    const activePrice = finalItem.activePrice;

    // Lot Title
    ctx.fillStyle = '#0F172A';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      `LÔ ${lotIdx + 1}: ${lot.lotName || lot.riceVariety} - ${formatVND(activePrice)}/kg (Trừ bì: ${flatTare > 0 ? 'Trừ khoán' : `${lot.tareWeightPerBag ?? batch.tareWeightPerBag ?? 0.2}kg`})`,
      padding,
      y
    );
    y += 15;

    const sheetsCount = Math.max(1, Math.ceil(lotBags.length / batch.bagsPerSheet));
    for (let s = 0; s < sheetsCount; s++) {
      const startIdx = s * batch.bagsPerSheet;
      const endIdx = Math.min(startIdx + batch.bagsPerSheet, lotBagCount);
      const sheetBags = lotBags.slice(startIdx, endIdx);
      if (sheetBags.length === 0) continue;
      const sheetGross = sheetBags.reduce((acc, b) => acc + b.weight, 0);

      y += 10;
      ctx.fillStyle = '#F1F5F9';
      ctx.fillRect(padding, y, width - padding * 2, 75);
      ctx.strokeStyle = '#CBD5E1';
      ctx.strokeRect(padding, y, width - padding * 2, 75);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Tờ ${s + 1} (${sheetBags.length} bao):`, padding + 14, y + 24);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`Tổng: ${sheetGross.toFixed(1)} kg`, width - padding - 14, y + 24);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#334155';
      ctx.font = '12px monospace';
      const rowStr = sheetBags.map((b) => `${b.bagIndex}:${b.weight.toFixed(1)}`).join('  |  ');
      ctx.fillText(rowStr, padding + 14, y + 52);

      y += 75;
    }

    y += 15;
  });

  // Porterage calculations
  const porterageFeePerBag = batch.porterFeePerBag ?? batch.porterageFeePerBag ?? 0;
  const totalPorterageFee = grandTotalBags * porterageFeePerBag;
  const porteragePayer = batch.porteragePayer || 'buyer';

  let finalPayout = grandTotalAmount - (batch.depositAmount || 0);
  if (porteragePayer === 'farmer') {
    finalPayout -= totalPorterageFee;
  }

  // Summary box
  y += 15;
  ctx.fillStyle = '#0F172A';
  ctx.fillRect(padding, y, width - padding * 2, 185);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Tổng số bao: ${grandTotalBags} bao`, padding + 20, y + 32);
  ctx.fillText(`Tổng ký gộp: ${grandGrossWeight.toFixed(1)} kg`, padding + 20, y + 60);
  ctx.fillText(`Trừ bao bì: -${grandTotalTare.toFixed(1)} kg`, padding + 20, y + 88);

  ctx.fillStyle = '#FBBF24'; // Yellow
  ctx.font = 'bold 17px sans-serif';
  ctx.fillText(`KÝ TỊNH: ${grandNetWeight.toFixed(1)} kg`, padding + 20, y + 125);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#94A3B8';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Tổng tiền: ${formatVND(grandTotalAmount)}`, width - padding - 20, y + 32);
  ctx.fillText(`Tiền cọc: -${formatVND(batch.depositAmount || 0)}`, width - padding - 20, y + 60);

  if (totalPorterageFee > 0) {
    if (porteragePayer === 'farmer') {
      ctx.fillText(`Bốc vác (${formatVND(porterageFeePerBag)}/bao): -${formatVND(totalPorterageFee)}`, width - padding - 20, y + 88);
    } else {
      ctx.fillText(`Bốc vác (${formatVND(porterageFeePerBag)}/bao): Lái trả`, width - padding - 20, y + 88);
    }
  } else {
    ctx.fillText(`Bốc vác: 0đ`, width - padding - 20, y + 88);
  }

  if (finalPayout < 0) {
    ctx.fillStyle = '#F59E0B'; // Amber warning for farmer debt
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`CÒN THIẾU: -${formatVND(Math.abs(finalPayout))}`, width - padding - 20, y + 125);
  } else {
    ctx.fillStyle = '#4ADE80'; // Neon green
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`CÒN LẠI: ${formatVND(finalPayout)}`, width - padding - 20, y + 125);
  }

  // Bằng chữ box (2 lines)
  y += 195;
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(padding, y, width - padding * 2, 70);
  ctx.strokeStyle = '#334155';
  ctx.strokeRect(padding, y, width - padding * 2, 70);

  ctx.fillStyle = '#FBBF24';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`⚖️ Ký tịnh bằng chữ: ${readVietnameseWeight(grandNetWeight)}`, padding + 16, y + 25);
  const payoutWord = finalPayout < 0
    ? `Nông dân còn thiếu lại lái: âm ${readVietnameseMoney(Math.abs(finalPayout))}`
    : readVietnameseMoney(finalPayout);
  ctx.fillText(`💵 Tiền thanh toán bằng chữ: ${payoutWord}`, padding + 16, y + 50);

  // Footer stamp
  y += 95;
  ctx.fillStyle = '#64748B';
  ctx.font = 'italic 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Phần mềm Cân Lúa Pro • Tác giả: Nguyễn Công Dinh (Cần Thơ) • Zalo: 039.399.0638', width / 2, y);

  return canvas.toDataURL('image/png');
}
