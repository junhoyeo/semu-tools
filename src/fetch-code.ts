import ky from 'ky';

namespace TossSecurities {
  type Product = {
    keyword: string;
    subKeyword: string;
    keywordType: any;
    productCode: string;
    productName: string;
    symbol: string;
    companyCode: string;
    logoImageUrl: string;
    market: string;
    base: {
      krw: number;
      usd: number;
    };
    close: {
      krw: number;
      usd: number;
    };
    stockStatus: 'N';
    autoComplete: boolean;
    code: string;
    subSectionQuery: string;
  };

  export type ProductSection = {
    type: 'PRODUCT';
    data: { items: Product[] };
  };

  type Section = ProductSection;

  export type WTSAutoCompleteResponse<T extends Section> = {
    result: T[];
  };

  export type WTSStockInfoResponse = {
    result: {
      isinCode: string;
    };
  };
}

const PRFIXES_TO_BE_REMOVED = [
  'INC',
  'CORPORATION',
  'LTD',
  'OYJ ADR EACH REPR 1 ORD NPV',
];
export const fetchISINCode = async (query: string) => {
  let cleanedQuery = query.trim();

  for (const prefix of PRFIXES_TO_BE_REMOVED) {
    if (cleanedQuery.endsWith(` ${prefix}`)) {
      cleanedQuery = cleanedQuery.replaceAll(` ${prefix}`, '');
    }
  }

  const data = await ky.post<
    TossSecurities.WTSAutoCompleteResponse<TossSecurities.ProductSection>
  >('https://wts-info-api.tossinvest.com/api/v3/search-all/wts-auto-complete', {
    headers: {},
    json: {
      query: cleanedQuery,
      sections: [
        { type: 'PRODUCT', option: { addIntegratedSearchResult: true } },
      ],
    },
  });
  const { result } = await data.json();
  const items = result.find((v) => v.type === 'PRODUCT')?.data.items || [];
  if (items.length > 0) {
    const code = items[0].code;

    const data = await ky.get<TossSecurities.WTSStockInfoResponse>(
      `https://wts-info-api.tossinvest.com/api/v2/stock-infos/${code}`,
    );
    const {
      result: { isinCode },
    } = await data.json();
    // console.log({ query, isinCode });

    return isinCode;
  }
  return null;
};
