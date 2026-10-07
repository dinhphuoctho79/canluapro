// Vietnamese number to words and currency dot formatting utilities

const defaultUnits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readBlock(n: number, isFull: boolean): string {
  if (n === 0) return '';
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const donVi = n % 10;

  let res = '';

  if (tram > 0 || isFull) {
    res += `${defaultUnits[tram]} trăm`;
    if (chuc === 0 && donVi > 0) {
      res += ' linh';
    }
  }

  if (chuc > 1) {
    res += ` ${defaultUnits[chuc]} mươi`;
    if (donVi === 1) res += ' mốt';
    else if (donVi === 5) res += ' lăm';
    else if (donVi > 0) res += ` ${defaultUnits[donVi]}`;
  } else if (chuc === 1) {
    res += ' mười';
    if (donVi === 5) res += ' lăm';
    else if (donVi > 0) res += ` ${defaultUnits[donVi]}`;
  } else if (chuc === 0 && donVi > 0 && tram > 0) {
    res += ` lẻ ${defaultUnits[donVi]}`;
  } else if (chuc === 0 && donVi > 0 && tram === 0 && isFull) {
    res += ` ${defaultUnits[donVi]}`;
  } else if (chuc === 0 && donVi > 0 && !isFull) {
    res += ` ${defaultUnits[donVi]}`;
  }

  return res.trim();
}

export function readVietnameseMoney(num: number): string {
  if (isNaN(num) || num <= 0) return 'Không đồng chẵn';
  const rounded = Math.round(num);

  const billion = Math.floor(rounded / 1000000000);
  const million = Math.floor((rounded % 1000000000) / 1000000);
  const thousand = Math.floor((rounded % 1000000) / 1000);
  const remainder = rounded % 1000;

  let parts: string[] = [];

  if (billion > 0) {
    parts.push(`${readBlock(billion, true)} tỷ`);
  }
  if (million > 0) {
    parts.push(`${readBlock(million, billion > 0)} triệu`);
  }
  if (thousand > 0) {
    parts.push(`${readBlock(thousand, billion > 0 || million > 0)} nghìn`);
  }
  if (remainder > 0 || parts.length === 0) {
    parts.push(readBlock(remainder, billion > 0 || million > 0 || thousand > 0));
  }

  let text = parts.join(' ').replace(/\s+/g, ' ').trim();
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
  }

  return `${text} đồng chẵn`;
}

export function readVietnameseWeight(num: number): string {
  if (isNaN(num) || num <= 0) return 'Không ki-lô-gam';
  const rounded = Math.round(num * 100) / 100;
  const integerPart = Math.floor(rounded);
  const fracStr = (rounded - integerPart).toFixed(2).split('.')[1];
  const fracNum = parseInt(fracStr, 10);

  const integerStr = readVietnameseMoney(integerPart).replace(' đồng chẵn', '');

  if (fracNum === 0) {
    return `${integerStr} ki-lô-gam`;
  }

  const trimmedFrac = fracStr.replace(/0+$/, '');
  if (!trimmedFrac) return `${integerStr} ki-lô-gam`;

  let decText = '';
  const val = parseInt(trimmedFrac, 10);
  if (trimmedFrac.length === 1) {
    decText = defaultUnits[val];
  } else if (trimmedFrac.length === 2) {
    if (val < 10) {
      decText = `không ${defaultUnits[val]}`;
    } else {
      decText = readBlock(val, true);
    }
  } else {
    let decWords: string[] = [];
    for (let char of trimmedFrac) {
      const digit = parseInt(char, 10);
      if (!isNaN(digit)) decWords.push(defaultUnits[digit]);
    }
    decText = decWords.join(' ');
  }

  return `${integerStr} phẩy ${decText} ki-lô-gam`;
}


export function formatNumberWithDots(val: number | string): string {
  if (val === undefined || val === null || val === '' || val === 0 || val === '0') return '';
  const clean = val.toString().replace(/\D/g, '');
  if (!clean || Number(clean) === 0) return '';
  return Number(clean).toLocaleString('vi-VN');
}

export function parseNumberFromDots(str: string): number {
  if (!str) return 0;
  const clean = str.toString().replace(/\D/g, '');
  if (!clean) return 0;
  return Number(clean) || 0;
}
