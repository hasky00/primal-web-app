export type CryptoCoin = {
  id: string,
  symbol: string,
  name: string,
  image: string,
  price: number,
  change24h: number,
};

type CoinGeckoMarket = {
  id?: string,
  symbol?: string,
  name?: string,
  image?: string,
  current_price?: number,
  price_change_percentage_24h?: number,
};

const coinGeckoMarkets = 'https://api.coingecko.com/api/v3/coins/markets';

// The coins the card shows. Listed here in market-cap order, but the order on
// screen is whatever CoinGecko returns, so the rows follow the market rather
// than this list.
export const cardCoinIds = [
  'bitcoin',
  'ethereum',
  'tether',
  'binancecoin',
  'monero',
];

export const cardCoinCount = cardCoinIds.length;

const convertToCoins = (markets: CoinGeckoMarket[]) =>
  markets.reduce<CryptoCoin[]>((acc, market) => {
    if (!market || typeof market.id !== 'string') return acc;

    return [ ...acc, {
      id: market.id,
      symbol: (market.symbol || '').toUpperCase(),
      name: market.name || market.id,
      image: market.image || '',
      price: typeof market.current_price === 'number' ? market.current_price : 0,
      change24h: typeof market.price_change_percentage_24h === 'number' ?
        market.price_change_percentage_24h :
        0,
    }];
  }, []);

const fetchMarkets = async (params: Record<string, string>) => {
  const url = new URL(coinGeckoMarkets);

  url.searchParams.set('vs_currency', 'usd');
  url.searchParams.set('price_change_percentage', '24h');

  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`CoinGecko responded with ${response.status}`);
  }

  const markets = await response.json();

  return Array.isArray(markets) ? convertToCoins(markets) : [];
};

export const fetchCryptoPrices = async () => await fetchMarkets({
  ids: cardCoinIds.join(','),
  order: 'market_cap_desc',
  per_page: `${cardCoinCount}`,
  page: '1',
});
