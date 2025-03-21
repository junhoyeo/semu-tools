import * as XLSX from 'xlsx';

import { fetchISINCode } from './fetch-code';

const STOCK_NAME_C_IDX = 0;
const STOCK_CODE_C_IDX = 20;

const main = async () => {
  // read from xlsx file in same folder as package.json and header row 제외하고 각 줄의 첫 번째 cell을 읽음.
  const workbook = XLSX.readFile('2021 해외주식 양도소득세.xlsx');
  const sheetName = workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];

  const range = XLSX.utils.decode_range(sheet['!ref']!);

  const headerCell =
    sheet[XLSX.utils.encode_cell({ r: range.s.r, c: STOCK_NAME_C_IDX })];
  if ((headerCell.v as string).trim() !== '주식 종목명') {
    throw Error('첫 번째 셀의 값이 `주식 종목명`이 아닙니다.');
  }

  const ISIN_CODE_MAPPING = new Map<string, string>(); // query -> ISIN code

  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: R, c: STOCK_NAME_C_IDX })];
    if (cell) {
      const value = cell.v as string;
      console.log(value);

      // query to ISIN code mapping
      let isinCode = ISIN_CODE_MAPPING.get(value);
      if (!isinCode) {
        // fetch ISIN code from API
        isinCode = (await fetchISINCode(value)) || '';
        ISIN_CODE_MAPPING.set(value, isinCode);
      }

      // STOCK_CODE_C_IDX에 ISIN code를 쓰기
      const cellAddress =
        sheet[XLSX.utils.encode_cell({ r: R, c: STOCK_CODE_C_IDX })];

      // 셀에 ISIN 코드 쓰기
      if (!sheet[cellAddress]) {
        sheet[cellAddress] = { t: 's', v: isinCode };
        console.log(`[CREATE] ${isinCode}`);
      } else {
        const currentValue = sheet[cellAddress].v;
        if (currentValue !== isinCode) {
          sheet[cellAddress].v = isinCode;
        }
      }
    }
  }

  await XLSX.writeFileAsync('2021 해외주식 양도소득세_ISIN.xlsx', workbook, {});
  console.log('ISIN 코드 업데이트가 완료되었습니다.');
};

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
