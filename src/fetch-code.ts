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

export const fetchISINCode = async (query: string) => {
  let cleanedQuery = query.trim();
  if (cleanedQuery.endsWith(' INC')) {
    cleanedQuery = cleanedQuery.replaceAll(' INC', '');
  }
  if (cleanedQuery.endsWith(' CORPORATION')) {
    cleanedQuery = cleanedQuery.replaceAll(' CORPORATION', '');
  }
  if (cleanedQuery.endsWith(' LTD')) {
    cleanedQuery = cleanedQuery.replaceAll(' LTD', '');
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
