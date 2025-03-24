import { useState, useEffect } from "react";
import { useDojo } from "@/context/dojo";
import { ChainId } from "@/dojo/setup/networks";
import { useProvider } from "@starknet-react/core";
import { EKUBO_PRICE_CONTRACT_ADDRESS, USDC_ADDRESS } from "@/lib/constants";
import { create } from "zustand";
import { BigNumberish } from "starknet";

export interface TokenPrices {
  [key: string]: number | undefined;
}

interface EkuboPriceProps {
  tokens: string[];
}

// Define types for pool data
interface PoolData {
  fee: BigNumberish;
  tick_spacing: number;
  exchange: string;
  volume0_24h: BigNumberish;
  volume1_24h: BigNumberish;
  fees0_24h: BigNumberish;
  fees1_24h: BigNumberish;
  tvl0_total: BigNumberish;
  tvl1_total: BigNumberish;
  tvl0_delta_24h: BigNumberish;
  tvl1_delta_24h: BigNumberish;
}

interface TokenInfo {
  pool: PoolData;
  decimals?: number;
  priceLoading?: boolean;
}

interface EkuboPoolState {
  tokenInfo: Record<string, TokenInfo>; // Keyed by token address
  setPool: (tokenAddress: string, poolData: PoolData) => void;
  setDecimals: (tokenAddress: string, decimals: number) => void;
  setPriceLoading: (tokenAddress: string, isLoading: boolean) => void;
  hasPool: (tokenAddress: string) => boolean;
  hasDecimals: (tokenAddress: string) => boolean;
  isPriceLoading: (tokenAddress: string) => boolean;
  getPool: (tokenAddress: string) => PoolData | undefined;
  getDecimals: (tokenAddress: string) => number | undefined;
  clearAll: () => void;
}

const getToken = (token: string) =>
  BigInt(token) < BigInt(USDC_ADDRESS)
    ? {
        token0: token,
        token1: USDC_ADDRESS,
        index: 0,
      }
    : {
        token0: USDC_ADDRESS,
        token1: token,
        index: 1,
      };

// Create the store
export const useEkuboPoolStore = create<EkuboPoolState>((set, get) => ({
  tokenInfo: {},

  setPool: (tokenAddress, poolData) => {
    set((state) => {
      const currentInfo = state.tokenInfo[tokenAddress] || {};
      return {
        tokenInfo: {
          ...state.tokenInfo,
          [tokenAddress]: {
            ...currentInfo,
            pool: poolData,
          },
        },
      };
    });
  },

  setDecimals: (tokenAddress, decimals) => {
    set((state) => {
      const currentInfo = state.tokenInfo[tokenAddress] || {};
      return {
        tokenInfo: {
          ...state.tokenInfo,
          [tokenAddress]: {
            ...currentInfo,
            decimals,
          },
        },
      };
    });
  },

  setPriceLoading: (tokenAddress, isLoading) => {
    set((state) => {
      const currentInfo = state.tokenInfo[tokenAddress] || {};
      return {
        tokenInfo: {
          ...state.tokenInfo,
          [tokenAddress]: {
            ...currentInfo,
            priceLoading: isLoading,
          },
        },
      };
    });
  },

  hasPool: (tokenAddress) => {
    return !!get().tokenInfo[tokenAddress]?.pool;
  },

  hasDecimals: (tokenAddress) => {
    return get().tokenInfo[tokenAddress]?.decimals !== undefined;
  },

  isPriceLoading: (tokenAddress) => {
    return !!get().tokenInfo[tokenAddress]?.priceLoading;
  },

  getPool: (tokenAddress) => {
    return get().tokenInfo[tokenAddress]?.pool;
  },

  getDecimals: (tokenAddress) => {
    return get().tokenInfo[tokenAddress]?.decimals;
  },

  clearAll: () => {
    set({ tokenInfo: {} });
  },
}));

export const useEkuboPrices = ({ tokens }: EkuboPriceProps) => {
  const { selectedChainConfig } = useDojo();
  const [prices, setPrices] = useState<TokenPrices>({});
  const [isLoading, setIsLoading] = useState(true);
  const { provider } = useProvider();
  const {
    setPool,
    hasPool,
    getPool,
    setDecimals,
    hasDecimals,
    getDecimals,
    setPriceLoading,
    isPriceLoading,
  } = useEkuboPoolStore();
  const [error, setError] = useState<string | null>(null);
  const [poolsLoaded, setPoolsLoaded] = useState(false);

  const isMainnet = selectedChainConfig.chainId === ChainId.SN_MAIN;
  const tokensKey = JSON.stringify(tokens);

  useEffect(() => {
    if (!isMainnet || !tokens.length) {
      return;
    }

    // Only add tokens that don't already have pools
    const tokensNeedingPools = tokens.filter((token) => !hasPool(token));

    // If no tokens need pools, we can consider pools loaded
    if (tokensNeedingPools.length === 0) {
      setPoolsLoaded(true);
    } else {
      setPoolsLoaded(false);
    }
  }, [tokensKey, isMainnet]);

  // we need to get the best pool to use for the price of the specific token pair
  // only do this once per token pair and store best pool values

  useEffect(() => {
    const fetchPools = async () => {
      if (!isMainnet || !tokens.length) return;

      setIsLoading(true);
      setError(null);

      try {
        // Process each token
        for (const token of tokens) {
          // Skip if we already have data for this token
          if (hasPool(token)) {
            continue;
          }

          // Determine token order (USDC is always one of the pair)
          const { token0, token1 } = getToken(token);

          // Fetch pools for this token pair
          const response = await fetch(
            `${selectedChainConfig.ekuboPriceAPI}/pair/${token0}/${token1}/pools`
          );

          if (!response.ok) {
            throw new Error(
              `Failed to fetch pools for ${token}: ${response.statusText}`
            );
          }

          const poolsData = await response.json();
          const pools = poolsData.topPools;

          // Find the pool with highest TVL
          if (pools && Array.isArray(pools) && pools.length > 0) {
            // Sort by TVL (highest first)
            const sortedPools = pools.sort((a, b) => {
              // Use bracket notation for dynamic property access
              return b[`tvl1_total`] - a[`tvl1_total`];
            });
            const highestTvlPool = sortedPools[0];

            // Store the pool data
            setPool(token, highestTvlPool);
          }

          // Get token decimals (fetch only if not already in store)
          let tokenDecimals: number;

          if (hasDecimals(token)) {
            // Use cached decimals
            tokenDecimals = getDecimals(token) || 18; // Default to 18 if undefined
          } else {
            // Fetch decimals from contract
            try {
              const decimalsResult = await provider?.callContract({
                contractAddress: token,
                entrypoint: "decimals",
                calldata: [],
              });

              tokenDecimals = decimalsResult ? Number(decimalsResult[0]) : 18;

              // Store in the cache
              setDecimals(token, tokenDecimals);
            } catch (error) {
              console.error(`Error fetching decimals for ${token}:`, error);
              tokenDecimals = 18; // Default to 18 on error
            }
          }
        }
      } catch (err) {
        console.error("Error fetching Ekubo pools:", err);
        setError(
          err instanceof Error ? err.message : "Unknown error fetching pools"
        );
      } finally {
        setPoolsLoaded(true);
        setIsLoading(false);
      }
    };

    fetchPools();
  }, [
    tokensKey,
    selectedChainConfig.ekuboPriceAPI,
    isMainnet,
    setPool,
    hasPool,
  ]);

  useEffect(() => {
    const fetchPrices = async () => {
      if (!poolsLoaded) return;

      try {
        if (!isMainnet) {
          // For non-mainnet, set all token prices to 1
          const mockPrices = tokens.reduce(
            (acc, token) => ({
              ...acc,
              [token]: 1,
            }),
            {}
          );
          setPrices(mockPrices);
          setIsLoading(false);
          return;
        }

        const pricePromises = tokens.map(async (token) => {
          if (!hasPool(token)) return { token, price: undefined };

          // Set loading state to true for this token
          setPriceLoading(token, true);

          const pool = getPool(token);

          if (!pool) {
            setPriceLoading(token, false);
            return { token, price: undefined };
          }

          const { token0, token1 } = getToken(token);

          try {
            const result = await provider?.callContract({
              contractAddress: EKUBO_PRICE_CONTRACT_ADDRESS,
              entrypoint: "get_pool_price",
              calldata: [token0, token1, pool.fee, pool.tick_spacing, 0],
            });

            const tokenDecimals = getDecimals(token);

            const basePrice = (Number(result[0]) / 2 ** 128) ** 2;
            const price = basePrice * 10 ** (Number(tokenDecimals) - 6);

            // Set loading to false when done
            setPriceLoading(token, false);

            return {
              token,
              price,
            };
          } catch (error) {
            console.error(`Error fetching ${token} price:`, error);
            // Set loading to false on error
            setPriceLoading(token, false);
            return { token, price: undefined };
          }
        });

        const results = await Promise.all(pricePromises);
        const newPrices = results.reduce(
          (acc, { token, price }) => ({
            ...acc,
            [token]: price,
          }),
          {}
        );

        setPrices(newPrices);
      } catch (error) {
        console.error("Error fetching prices:", error);
        // Set loading to false for all tokens on error
        tokens.forEach((token) => setPriceLoading(token, false));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, [
    poolsLoaded,
    tokensKey,
    selectedChainConfig.ekuboPriceAPI,
    isMainnet,
    getPool,
  ]);

  return {
    prices,
    isLoading,
    error,
    getPrice: (token: string) => prices[token],
    getPoolForToken: getPool,
    getTokenDecimals: getDecimals,
    isTokenPriceLoading: isPriceLoading,
  };
};

// Helper hook to get pool data for a specific token
export function useTokenPool(tokenAddress: string) {
  const pool = useEkuboPoolStore((state) => state.getPool(tokenAddress));
  return pool;
}

// Helper hook to check if a token's price is loading
export function useTokenPriceLoading(tokenAddress: string) {
  const isLoading = useEkuboPoolStore((state) =>
    state.isPriceLoading(tokenAddress)
  );
  return isLoading;
}
