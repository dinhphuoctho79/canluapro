import { RiceBatch, RiceLot } from '../types';
import { formatVND, formatNumber } from './export';
import { removeVietnameseAccents } from './vietqr';

// ESC/POS Command Constants
const ESC = 0x1b;
const GS = 0x1d;

export interface PrinterConnection {
  device: BluetoothDevice;
  server: BluetoothRemoteGATTServer;
  characteristic: BluetoothRemoteGATTCharacteristic;
}

// Global active printer connection reference
let activePrinter: PrinterConnection | null = null;

/**
 * Strips accents specifically for thermal printers to prevent character encoding issues
 */
export function sanitizeForThermalPrinter(text: string): string {
  return removeVietnameseAccents(text);
}

/**
 * Pad string for 58mm (32 chars) or 80mm (48 chars) line width
 */
export function formatTwoColumns(left: string, right: string, width: number = 32): string {
  const cleanLeft = left.trim();
  const cleanRight = right.trim();
  const spacesNeeded = Math.max(1, width - cleanLeft.length - cleanRight.length);
  return cleanLeft + ' '.repeat(spacesNeeded) + cleanRight;
}

/**
 * Generate formatted plain text / ESC-POS buffer for rice weighing receipt
 */
export function generateEscPosReceipt(batch: RiceBatch, paperWidth: 58 | 80 = 58): Uint8Array {
  const lineWidth = paperWidth === 58 ? 32 : 48;
  const separator = '-'.repeat(lineWidth);
  const doubleSeparator = '='.repeat(lineWidth);

  // Collect all lots or single batch
  const lots: RiceLot[] =
    batch.lots && batch.lots.length > 0
      ? batch.lots.map((lot) => ({
          ...lot,
          pricePerKg: Number(lot.pricePerKg) > 0 ? Number(lot.pricePerKg) : (Number(batch.pricePerKg) > 0 ? Number(batch.pricePerKg) : 0),
          tareWeightPerBag: lot.tareWeightPerBag ?? batch.tareWeightPerBag ?? 0.2,
        }))
      : [
          {
            id: 'default',
            lotName: 'Lô lúa chính',
            riceVariety: batch.riceVariety,
            pricePerKg: Number(batch.pricePerKg) || 0,
            tareWeightPerBag: batch.tareWeightPerBag ?? 0.2,
            bags: batch.bags,
          },
        ];

  // Commands buffer builder
  const bytes: number[] = [];

  const addBytes = (...arr: number[]) => {
    bytes.push(...arr);
  };

  const addText = (text: string) => {
    // Convert to unaccented ASCII for universal ESC/POS thermal compatibility
    const safeText = sanitizeForThermalPrinter(text);
    for (let i = 0; i < safeText.length; i++) {
      bytes.push(safeText.charCodeAt(i));
    }
  };

  const addLine = (text: string = '') => {
    if (text) addText(text);
    bytes.push(0x0a); // LF
  };

  // 1. Initialize printer
  addBytes(ESC, 0x40); // ESC @ (Reset/Initialize)

  // 2. Center Align & Bold Title
  addBytes(ESC, 0x61, 0x01); // Center
  addBytes(ESC, 0x45, 0x01); // Bold ON
  addBytes(GS, 0x21, 0x11);  // Double width & height
  addLine('PHIEU CAN LUA PRO');
  addBytes(GS, 0x21, 0x00);  // Normal size
  addLine('THU MUA LUA CHUYEN NGHIEP');
  addBytes(ESC, 0x45, 0x00); // Bold OFF
  addLine(doubleSeparator);

  // 3. Left Align - Farm & Buyer info
  addBytes(ESC, 0x61, 0x00); // Align Left
  addLine(formatTwoColumns('Ma phieu:', batch.code, lineWidth));
  addLine(formatTwoColumns('Ngay can:', batch.date, lineWidth));
  addLine(formatTwoColumns('Chu ruong:', batch.farmerName || 'Chua dat ten', lineWidth));
  if (batch.farmerPhone) {
    addLine(formatTwoColumns('So DT:', batch.farmerPhone, lineWidth));
  }
  addLine(separator);

  let grandTotalBags = 0;
  let grandGrossWeight = 0;
  let grandTotalTare = 0;
  let grandNetWeight = 0;
  let grandTotalAmount = 0;

  // 4. Details per lot
  lots.forEach((lot, lotIdx) => {
    const lotBags = lot.bags;
    const lotBagCount = lotBags.length;
    const lotGross = lotBags.reduce((s, b) => s + b.weight, 0);
    const lotTare = lotBagCount * (lot.tareWeightPerBag ?? batch.tareWeightPerBag ?? 0.2);
    const lotNet = Math.max(0, lotGross - lotTare);
    const activePrice = Number(lot.pricePerKg) > 0 ? Number(lot.pricePerKg) : (Number(batch.pricePerKg) > 0 ? Number(batch.pricePerKg) : 0);
    const lotAmount = Math.round(lotNet * activePrice);

    grandTotalBags += lotBagCount;
    grandGrossWeight += lotGross;
    grandTotalTare += lotTare;
    grandNetWeight += lotNet;
    grandTotalAmount += lotAmount;

    if (lots.length > 1) {
      addBytes(ESC, 0x45, 0x01); // Bold ON
      addLine(`LO ${lotIdx + 1}: ${lot.lotName || lot.riceVariety}`);
      addBytes(ESC, 0x45, 0x00); // Bold OFF
    }

    addLine(formatTwoColumns('Giong lua:', lot.riceVariety, lineWidth));
    addLine(formatTwoColumns('Don gia:', `${formatNumber(activePrice, 0)} d/kg`, lineWidth));
    addLine(formatTwoColumns('Tru bao:', `${lot.tareWeightPerBag ?? batch.tareWeightPerBag ?? 0.2} kg/bao`, lineWidth));
    addLine(separator);

    // Sheets in this lot
    const sheetsCount = Math.max(1, Math.ceil(lotBags.length / batch.bagsPerSheet));
    for (let s = 1; s <= sheetsCount; s++) {
      const startIndex = (s - 1) * batch.bagsPerSheet;
      const sheetBags = lotBags.slice(startIndex, startIndex + batch.bagsPerSheet);
      const sheetGross = sheetBags.reduce((acc, b) => acc + b.weight, 0);

      addLine(`TO ${s} (${sheetBags.length} bao) - Tong: ${sheetGross.toFixed(1)}kg`);

      // Print bags in lines of 3 or 4 weights
      const itemsPerLine = paperWidth === 58 ? 3 : 5;
      for (let i = 0; i < sheetBags.length; i += itemsPerLine) {
        const slice = sheetBags.slice(i, i + itemsPerLine);
        const weightsStr = slice
          .map((b) => `#${b.bagIndex}:${b.weight.toFixed(1)}`)
          .join(' ');
        addLine(`  ${weightsStr}`);
      }
      addLine();
    }

    if (lots.length > 1) {
      addLine(formatTwoColumns(`T.Ket Lo ${lotIdx + 1}:`, `${lotBagCount} bao | ${lotNet.toFixed(1)}kg`, lineWidth));
      addLine(formatTwoColumns('Tien Lo:', `${formatNumber(lotAmount, 0)} d`, lineWidth));
      addLine(separator);
    }
  });

  // 5. Porterage Fee Calculations
  const porterageFeePerBag = batch.porterFeePerBag ?? batch.porterageFeePerBag ?? 0;
  const totalPorterageFee = grandTotalBags * porterageFeePerBag;
  const porteragePayer = batch.porteragePayer || 'buyer';

  let finalPayout = grandTotalAmount - (batch.depositAmount || 0);
  if (porteragePayer === 'farmer') {
    finalPayout -= totalPorterageFee;
  }

  // 6. Grand Summary
  addBytes(ESC, 0x45, 0x01); // Bold ON
  addLine('TONG KET THANH TOAN:');
  addBytes(ESC, 0x45, 0x00); // Bold OFF
  addLine(formatTwoColumns('Tong so bao:', `${grandTotalBags} bao`, lineWidth));
  addLine(formatTwoColumns('Tong ky gop:', `${grandGrossWeight.toFixed(1)} kg`, lineWidth));
  addLine(formatTwoColumns('Tru vo bao:', `-${grandTotalTare.toFixed(1)} kg`, lineWidth));

  addBytes(ESC, 0x45, 0x01); // Bold ON
  addLine(formatTwoColumns('KY TINH:', `${grandNetWeight.toFixed(1)} kg`, lineWidth));
  addLine(formatTwoColumns('Tong thanh tien:', `${formatNumber(grandTotalAmount, 0)} d`, lineWidth));
  addBytes(ESC, 0x45, 0x00); // Bold OFF

  if (batch.depositAmount > 0) {
    addLine(formatTwoColumns('Tien coc da ung:', `-${formatNumber(batch.depositAmount, 0)} d`, lineWidth));
  }

  if (totalPorterageFee > 0) {
    if (porteragePayer === 'farmer') {
      addLine(formatTwoColumns('Tien boc vac (Dan tra):', `-${formatNumber(totalPorterageFee, 0)} d`, lineWidth));
    } else {
      addLine(formatTwoColumns('Tien boc vac (Lai tra):', `${formatNumber(totalPorterageFee, 0)} d`, lineWidth));
    }
  }

  addLine(doubleSeparator);

  // 7. Huge Payout Highlight (Double Size)
  addBytes(ESC, 0x61, 0x01); // Center
  addBytes(ESC, 0x45, 0x01); // Bold ON
  if (finalPayout < 0) {
    addLine('NONG DAN CON THIEU LAI LAI:');
    addBytes(GS, 0x21, 0x11);  // Double size
    addLine(`-${formatNumber(Math.abs(finalPayout), 0)} D`);
  } else {
    addLine('TIEN CON LAI TRA NONG DAN:');
    addBytes(GS, 0x21, 0x11);  // Double size
    addLine(`${formatNumber(finalPayout, 0)} D`);
  }
  addBytes(GS, 0x21, 0x00);  // Normal size
  addBytes(ESC, 0x45, 0x00); // Bold OFF

  addLine(doubleSeparator);
  addLine('(Ky ten xac nhan)');
  addLine();
  addLine(formatTwoColumns('Chu Ruong', 'Thuong Lai', lineWidth));
  addLine();
  addLine();
  addLine();
  addLine(formatTwoColumns('.............', '.............', lineWidth));
  addLine();
  addLine('Cam on ba con nong dan!');
  addLine('Can Lua Pro • Tac gia: Nguyen Cong Dinh');
  addLine('Zalo: 039.399.0638 (Can Tho)');

  // 8. Feed 4 lines and cut paper
  addLine();
  addLine();
  addLine();
  addLine();
  addBytes(GS, 0x56, 0x42, 0x00); // GS V B 0 (Cut paper)

  return new Uint8Array(bytes);
}

/**
 * Connect to mini Bluetooth Thermal Printer using Web Bluetooth API
 */
export async function connectBluetoothPrinter(): Promise<PrinterConnection> {
  if (typeof navigator === 'undefined' || !navigator.bluetooth) {
    throw new Error('Trình duyệt không hỗ trợ Web Bluetooth API. Vui lòng dùng Chrome trên Android hoặc máy tính.');
  }

  // Common thermal printer Bluetooth GATT Service UUIDs
  // 000018f0-0000-1000-8000-00805f9b34fb (Standard POS)
  // 49535343-fe7d-4ae5-8fa9-9fafd205e455 (ISSC Transparent)
  // e7810a71-73ae-499d-8c15-59b60dafbcd1 (POS-58/80)
  // 0000ffe0-0000-1000-8000-00805f9b34fb (HM-10 / MPT)
  const PRINTER_SERVICES = [
    '000018f0-0000-1000-8000-00805f9b34fb',
    'e7810a71-73ae-499d-8c15-59b60dafbcd1',
    '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    '0000ffe0-0000-1000-8000-00805f9b34fb',
    '00001101-0000-1000-8000-00805f9b34fb',
  ];

  try {
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: PRINTER_SERVICES,
    });

    if (!device.gatt) {
      throw new Error('Thiết bị không hỗ trợ kết nối GATT Bluetooth.');
    }

    const server = await device.gatt.connect();

    // Scan for available services and find writable characteristic
    let characteristic: BluetoothRemoteGATTCharacteristic | null = null;

    const services = await server.getPrimaryServices().catch(() => []);
    for (const service of services) {
      const chars = await service.getCharacteristics().catch(() => []);
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          characteristic = char;
          break;
        }
      }
      if (characteristic) break;
    }

    if (!characteristic) {
      throw new Error('Không tìm thấy kênh ghi dữ liệu (Writable Characteristic) của máy in.');
    }

    activePrinter = { device, server, characteristic };
    return activePrinter;
  } catch (err: unknown) {
    activePrinter = null;
    throw err;
  }
}

/**
 * Print receipt bytes through Bluetooth in chunks to prevent BLE packet buffer overflow
 */
export async function printReceiptBluetooth(
  batch: RiceBatch,
  paperWidth: 58 | 80 = 58,
  existingConnection?: PrinterConnection | null
): Promise<void> {
  const connection = existingConnection || activePrinter || (await connectBluetoothPrinter());

  const data = generateEscPosReceipt(batch, paperWidth);

  // Send in chunks of 100 bytes (standard BLE MTU compatibility)
  const CHUNK_SIZE = 100;
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    if (connection.characteristic.properties.writeWithoutResponse) {
      await connection.characteristic.writeValueWithoutResponse(chunk);
    } else {
      await connection.characteristic.writeValue(chunk);
    }
    // Small delay between chunks to let printer buffer process
    await new Promise((r) => setTimeout(r, 25));
  }
}

/**
 * Check if Web Bluetooth is supported
 */
export function isBluetoothSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}
