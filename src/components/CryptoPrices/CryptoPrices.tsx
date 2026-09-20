import {
  Component,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from 'solid-js';
import { createStore } from 'solid-js/store';

import styles from './CryptoPrices.module.scss';
import { hookForDev } from '../../lib/devTools';
import { logError } from '../../lib/logger';
import { cardCoinCount, CryptoCoin, fetchCryptoPrices } from '../../lib/crypto';
import { date } from '../../lib/dates';
import { now } from '../../utils';
import { useAppContext } from '../../contexts/AppContext';
import CryptoPriceSkeleton from '../Skeleton/CryptoPriceSkeleton';

const refreshInterval = 60_000;

const priceFormat = (price: number) => {
  // Sub-dollar coins need more precision than the usual two decimals.
  const digits = price >= 1 ? 2 : price >= 0.01 ? 4 : 6;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(price);
};

// Below this a change rounds to 0.00%, and a stablecoin like USDT would
// otherwise sit under a coloured arrow all day. Show those rows as flat.
const flatChangeThreshold = 0.005;

const changeFormat = (change: number) => {
  if (Math.abs(change) < flatChangeThreshold) return '0.00%';

  const sign = change > 0 ? '+' : '';

  return `${sign}${change.toFixed(2)}%`;
};

const CryptoPrices: Component< { id?: string } > = (props) => {
  const app = useAppContext();

  const [coins, setCoins] = createStore<CryptoCoin[]>([]);
  const [isFetching, setIsFetching] = createSignal(false);
  const [hasError, setHasError] = createSignal(false);
  const [lastUpdated, setLastUpdated] = createSignal(0);

  // Bumped on every tick so the "updated" label keeps counting up even when
  // a refresh fails and `lastUpdated` stays put.
  const [tick, setTick] = createSignal(0);

  let refreshTimer = 0;

  const updatePrices = async () => {
    if (isFetching()) return;

    setIsFetching(true);

    try {
      const prices = await fetchCryptoPrices();

      // Keep the last good prices if the API hands back an empty list.
      if (prices.length > 0) {
        setCoins(() => [ ...prices ]);
        setLastUpdated(now());
      }

      setHasError(false);
    } catch (e) {
      logError('Failed to fetch crypto prices: ', e);
      setHasError(true);
    } finally {
      setIsFetching(false);
    }
  };

  onMount(() => {
    updatePrices();

    refreshTimer = setInterval(() => {
      setTick(t => t + 1);

      // Don't burn CoinGecko's free rate limit on an idle tab.
      if (app?.isInactive) return;

      updatePrices();
    }, refreshInterval);
  });

  onCleanup(() => {
    clearInterval(refreshTimer);
  });

  const updatedLabel = () => {
    tick();

    const timestamp = lastUpdated();

    if (timestamp === 0) return '';

    const diff = now() - timestamp;

    return diff < 60 ? 'just now' : `${date(timestamp).label} ago`;
  };

  const isFlat = (coin: CryptoCoin) =>
    Math.abs(coin.change24h) < flatChangeThreshold;

  const isUp = (coin: CryptoCoin) => coin.change24h >= 0;

  const changeClass = (coin: CryptoCoin) => {
    if (isFlat(coin)) return styles.changeFlat;

    return isUp(coin) ? styles.changeUp : styles.changeDown;
  };

  return (
    <div id={props.id} class={styles.cryptoPrices}>
      <div class={styles.heading}>
        <div>Crypto Prices</div>
      </div>

      <Show
        when={coins.length > 0}
        fallback={
          <Show
            when={!hasError()}
            fallback={<div class={styles.unavailable}>Prices unavailable</div>}
          >
            <div class={styles.list}>
              <For each={new Array(cardCoinCount)}>
                {() => <CryptoPriceSkeleton />}
              </For>
            </div>
          </Show>
        }
      >
        <div class={styles.list}>
          <For each={coins}>
            {coin => (
              <div class={styles.coin}>
                <Show when={coin.image.length > 0}>
                  <img
                    class={styles.icon}
                    src={coin.image}
                    alt={coin.name}
                    loading="lazy"
                    onError={(e) => { e.currentTarget.style.display = 'none' }}
                  />
                </Show>

                <div class={styles.coinInfo}>
                  <div class={styles.coinName}>{coin.name}</div>
                  <div class={styles.coinSymbol}>{coin.symbol}</div>
                </div>

                <div class={styles.coinValue}>
                  <div class={styles.price}>{priceFormat(coin.price)}</div>
                  <div class={changeClass(coin)}>
                    <Show when={!isFlat(coin)}>
                      <div class={isUp(coin) ? styles.arrowUp : styles.arrowDown}></div>
                    </Show>
                    <span>{changeFormat(coin.change24h)}</span>
                  </div>
                </div>
              </div>
            )}
          </For>
        </div>

        <Show when={updatedLabel().length > 0}>
          <div class={styles.updated}>
            <Show
              when={!hasError()}
              fallback={<>prices unavailable, updated {updatedLabel()}</>}
            >
              updated {updatedLabel()}
            </Show>
          </div>
        </Show>
      </Show>
    </div>
  );
}

export default hookForDev(CryptoPrices);
