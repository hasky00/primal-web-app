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

// How many top-by-market-cap coins the card leads with.
export const topCoinCount = 5;

// Coins the card always shows, in this order, even when they miss the top list.
export const pinnedCoinIds = ['bitcoin', 'ethereum', 'monero'];

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

export const fetchCryptoPrices = async () => {
  const top = await fetchMarkets({
    order: 'market_cap_desc',
    per_page: `${topCoinCount}`,
    page: '1',
  });

  const missing = pinnedCoinIds.filter(id => !top.some(coin => coin.id === id));

  // Only spend a second request when a pinned coin missed the top list.
  const pinned = missing.length === 0 ?
    [] :
    await fetchMarkets({ ids: missing.join(',') });

  // CoinGecko returns an `ids` query in market-cap order, so re-sort the
  // pinned coins into the order they are declared in.
  const orderedPinned = pinnedCoinIds.reduce<CryptoCoin[]>((acc, id) => {
    const coin = pinned.find(c => c.id === id);

    return coin ? [ ...acc, coin ] : acc;
  }, []);

  return [ ...top, ...orderedPinned ];
};
