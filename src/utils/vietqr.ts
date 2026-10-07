import QRCode from 'qrcode';
import { BankItem } from '../types';

export const POPULAR_VIETNAMESE_BANKS: BankItem[] = [
  { id: 'agribank', code: 'VBA', name: 'Ngân hàng Nông nghiệp & PTNT (Agribank)', shortName: 'Agribank', bin: '970405' },
  { id: 'vietcombank', code: 'VCB', name: 'Ngân hàng TMCP Ngoại Thương (Vietcombank)', shortName: 'Vietcombank', bin: '970436' },
  { id: 'bidv', code: 'BIDV', name: 'Ngân hàng TMCP Đầu tư và Phát triển VN (BIDV)', shortName: 'BIDV', bin: '970418' },
  { id: 'vietinbank', code: 'CTG', name: 'Ngân hàng TMCP Công Thương VN (VietinBank)', shortName: 'VietinBank', bin: '970415' },
  { id: 'mbbank', code: 'MB', name: 'Ngân hàng TMCP Quân Đội (MB Bank)', shortName: 'MB Bank', bin: '970422' },
  { id: 'sacombank', code: 'STB', name: 'Ngân hàng TMCP Sài Gòn Thương Tín (Sacombank)', shortName: 'Sacombank', bin: '970403' },
  { id: 'acb', code: 'ACB', name: 'Ngân hàng TMCP Á Châu (ACB)', shortName: 'ACB', bin: '970416' },
  { id: 'techcombank', code: 'TCB', name: 'Ngân hàng TMCP Kỹ Thương (Techcombank)', shortName: 'Techcombank', bin: '970407' },
  { id: 'vpbank', code: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)', shortName: 'VPBank', bin: '970432' },
  { id: 'hdbank', code: 'HDB', name: 'Ngân hàng TMCP Phát Triển TP.HCM (HDBank)', shortName: 'HDBank', bin: '970437' },
  { id: 'tpbank', code: 'TPB', name: 'Ngân hàng TMCP Tiên Phong (TPBank)', shortName: 'TPBank', bin: '970423' },
  { id: 'lpbank', code: 'LPB', name: 'Ngân hàng TMCP Lộc Phát VN (LPBank)', shortName: 'LPBank', bin: '970449' },
  { id: 'shb', code: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)', shortName: 'SHB', bin: '970443' },
  { id: 'ocb', code: 'OCB', name: 'Ngân hàng TMCP Phương Đông (OCB)', shortName: 'OCB', bin: '970448' },
];

export interface VietQRParams {
  bankBin: string;
  accountNumber: string;
  accountName?: string;
  amount: number;
  memo: string; // e.g. "TIEN LUA CHU BAY"
}

// Strip Vietnamese accents for standard bank transfer memo
export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/**
 * Generates an online VietQR URL from Napas / VietQR service
 */
export function getOnlineVietQRUrl(params: VietQRParams): string {
  const cleanMemo = removeVietnameseAccents(params.memo).slice(0, 50);
  const cleanName = params.accountName ? removeVietnameseAccents(params.accountName) : '';
  const roundedAmount = Math.max(0, Math.round(params.amount));

  const url = new URL(`https://api.vietqr.io/image/${params.bankBin}-${params.accountNumber}-compact2.png`);
  if (roundedAmount > 0) {
    url.searchParams.set('amount', roundedAmount.toString());
  }
  if (cleanMemo) {
    url.searchParams.set('addInfo', cleanMemo);
  }
  if (cleanName) {
    url.searchParams.set('accountName', cleanName);
  }

  return url.toString();
}

/**
 * Builds standard Napas247 / EMVCo TLV format string for 100% offline QR generation
 */
function buildTLV(tag: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

export function buildEMVCoString(params: VietQRParams): string {
  const roundedAmount = Math.max(0, Math.round(params.amount));
  const cleanMemo = removeVietnameseAccents(params.memo).slice(0, 50);

  // Payload Format Indicator (00) = 01
  let emv = buildTLV('00', '01');
  // Point of Initiation Method (01) = 12 (Dynamic QR with amount) or 11 (Static)
  emv += buildTLV('01', roundedAmount > 0 ? '12' : '11');

  // Consumer Account Information (38): VietQR standard
  // 00: GUID A000000727
  // 01: Payment Network Specific (00: Bank BIN, 01: Account No)
  // 02: Service Code QRIBFTTA
  const sub38_00 = buildTLV('00', 'A000000727');
  const sub38_01_00 = buildTLV('00', params.bankBin);
  const sub38_01_01 = buildTLV('01', params.accountNumber);
  const sub38_01 = buildTLV('01', sub38_01_00 + sub38_01_01);
  const sub38_02 = buildTLV('02', 'QRIBFTTA');
  emv += buildTLV('38', sub38_00 + sub38_01 + sub38_02);

  // Transaction Currency (53) = 704 (VND)
  emv += buildTLV('53', '704');

  // Transaction Amount (54)
  if (roundedAmount > 0) {
    emv += buildTLV('54', roundedAmount.toString());
  }

  // Country Code (58) = VN
  emv += buildTLV('58', 'VN');

  // Additional Data Field (62): Purpose of Transaction (08)
  if (cleanMemo) {
    const sub62_08 = buildTLV('08', cleanMemo);
    emv += buildTLV('62', sub62_08);
  }

  // CRC (63) calculation: CRC16-CCITT
  const crcPrefix = '6304';
  const dataForCrc = emv + crcPrefix;
  const crcValue = calculateCRC16CCITT(dataForCrc);
  return dataForCrc + crcValue;
}

function calculateCRC16CCITT(str: string): string {
  let crc = 0xffff;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Generate high-res QR Data URL (works 100% offline anywhere on field)
 */
export async function generateOfflineQRCodeDataUrl(params: VietQRParams): Promise<string> {
  const emvStr = buildEMVCoString(params);
  return await QRCode.toDataURL(emvStr, {
    width: 320,
    margin: 1,
    color: {
      dark: '#020617',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
  });
}
