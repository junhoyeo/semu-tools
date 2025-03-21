import * as XLSX from 'xlsx';

import { fetchISINCode } from './fetch-code';

const STOCK_NAME_COL = 'A';
const STOCK_CODE_COL = 'U';

const main = async () => {
  const workbook = XLSX.readFile('2021 해외주식 양도소득세.xlsx');
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 'A' });

  const headers: any = data[0];

  if (headers[STOCK_NAME_COL] !== '주식 종목명') {
    throw Error(
      `첫 번째 셀의 값이 \'주식 종목명\'이 아닙니다.': ${headers[STOCK_NAME_COL]}`,
    );
  }

  const ISIN_CODE_MAPPING = new Map<string, string>();

  for (let i = 1; i < data.length; i++) {
    const row: any = data[i];
    const stockName = row[STOCK_NAME_COL];
    if (!stockName) {
      throw Error(`주식 종목명이 없습니다.: ${i}`);
    }

    // ISIN 코드 가져오기
    let isinCode = ISIN_CODE_MAPPING.get(stockName);
    if (!isinCode) {
      isinCode = (await fetchISINCode(stockName)) || '';
      console.log(`[FETCH] ${isinCode || 'Unknown'} for ${stockName}`);
      if (isinCode) {
        ISIN_CODE_MAPPING.set(stockName, isinCode);
      }
    }

    const currentValue = row[STOCK_CODE_COL];
    if (!currentValue) {
      row[STOCK_CODE_COL] = isinCode;
      console.log(`[CREATE] ${isinCode}`);
    } else if (currentValue !== isinCode) {
      console.log(`[UPDATE] ${currentValue} -> ${isinCode}`);
      row[STOCK_CODE_COL] = isinCode;
    } else {
      console.log(`[UNCHANGED] ${isinCode}`);
    }
  }

  const newSheet = XLSX.utils.json_to_sheet(data, { skipHeader: true });
  const columnWidths = Array.from({ length: 21 }, () => ({ wch: 15 }));
  newSheet['!cols'] = columnWidths;
  newSheet['!ref'] = sheet['!ref'];
  workbook.Sheets[sheetName] = newSheet;

  XLSX.writeFile(workbook, '2021 해외주식 양도소득세_ISIN.xlsx');
  console.log('ISIN 코드 업데이트가 완료되었습니다.');
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
