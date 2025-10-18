import { useState, useEffect, useCallback } from "react";
import { useDojo } from "@/context/dojo";
import { ChainId } from "@/dojo/setup/networks";

export interface TokenPrices {
  [key: string]: number | undefined;
}

interface TokenLoadingStates {
  [key: string]: boolean;
}

interface TokenErrorStates {
  [key: string]: boolean;
}

interface PriceResult {
  token: string;
  price: number | undefined;
  timedOut: boolean;
  error: boolean;
}

interface EkuboPriceProps {
  tokens: string[];
  timeoutMs?: number; // Optional timeout parameter
}

export const useEkuboPrices = ({
  tokens,
  timeoutMs = 10000,
}: EkuboPriceProps) => {
  const { selectedChainConfig } = useDojo();
  const [prices, setPrices] = useState<TokenPrices>({});
  const [isLoading, setIsLoading] = useState(true);

  // Initialize loading states to true for all tokens
  const [tokenLoadingStates, setTokenLoadingStates] =
    useState<TokenLoadingStates>(() =>
      tokens.reduce((acc, token) => ({ ...acc, [token]: true }), {})
    );

  const [tokenErrorStates, setTokenErrorStates] = useState<TokenErrorStates>(
    () => tokens.reduce((acc, token) => ({ ...acc, [token]: false }), {})
  );

  const isMainnet = selectedChainConfig.chainId === ChainId.SN_MAIN;
  // Sort tokens to ensure consistent key regardless of order
  const tokensKey = JSON.stringify([...tokens].sort());

  // Safe check if a token is available (has price, not loading, no error)
  const isTokenAvailable = useCallback(
    (token: string): boolean => {
      // If the token isn't in our list, it's not available
      if (!tokens.includes(token)) return false;

      // If it's loading, it's not available yet
      if (tokenLoadingStates[token] === true) return false;

      // If it has an error, it's not available
      if (tokenErrorStates[token] === true) return false;

      // If it doesn't have a price, it's not available
      if (prices[token] === undefined) return false;

      // Otherwise, it's available
      return true;
    },
    [tokens, tokenLoadingStates, tokenErrorStates, prices]
  );

  // Helper function that considers a token loading if it's marked as loading
  const isTokenLoading = useCallback(
    (token: string): boolean => {
      // If the token isn't in our list, consider it loading
      if (!tokens.includes(token)) return true;

      return tokenLoadingStates[token] === true;
    },
    [tokens, tokenLoadingStates]
  );

  // Helper function to check if a token has an error
  const hasTokenError = useCallback(
    (token: string): boolean => {
      // If the token isn't in our list, it doesn't have an error yet
      if (!tokens.includes(token)) return false;

      return tokenErrorStates[token] === true;
    },
    [tokens, tokenErrorStates]
  );

  // Safe getter that only returns a price if the token is available
  const getPrice = useCallback(
    (token: string): number | undefined => {
      if (!isTokenAvailable(token)) {
        return undefined;
      }

      return prices[token];
    },
    [isTokenAvailable, prices]
  );

  useEffect(() => {
    // Skip if no tokens
    if (!tokens || tokens.length === 0) {
      setIsLoading(false);
      setPrices({});
      setTokenLoadingStates({});
      setTokenErrorStates({});
      return;
    }

    console.log('useEkuboPrices: Fetching prices for tokens:', tokens);

    // Reset all states when tokens change
    setIsLoading(true);

    // Initialize all tokens as loading and not in error state
    setTokenLoadingStates(
      tokens.reduce((acc, token) => ({ ...acc, [token]: true }), {})
    );

    setTokenErrorStates(
      tokens.reduce((acc, token) => ({ ...acc, [token]: false }), {})
    );

    const fetchPrices = async () => {
      try {
        if (!isMainnet) {
          // For non-mainnet, set all token prices to 1
          const mockPrices = tokens.reduce(
            (acc, token) => ({ ...acc, [token]: 1 }),
            {}
          );
          setPrices(mockPrices);

          // Set all tokens as loaded and not in error
          setTokenLoadingStates(
            tokens.reduce((acc, token) => ({ ...acc, [token]: false }), {})
          );
          setIsLoading(false);
          return;
        }

        const pricePromises = tokens.map(async (token) => {
          // Manual override for USDC - always return price of 1
          if (token === "USDC" || token === "USDCe") {
            return { token, price: 1, timedOut: false, error: false };
          }

          // Create a timeout promise
          const timeoutPromise = new Promise<PriceResult>((resolve) => {
            setTimeout(() => {
              resolve({ token, price: undefined, timedOut: true, error: true });
            }, timeoutMs);
          });

          // Create the fetch promise
          const fetchPromise = (async () => {
            try {
              const result = await fetch(
                `${selectedChainConfig.ekuboPriceAPI!}/${token}/USDC/history`
              );

              if (!result.ok) {
                throw new Error(`HTTP error! status: ${result.status}`);
              }

              const contentType = result.headers.get("content-type");
              if (!contentType || !contentType.includes("application/json")) {
                throw new Error("API did not return JSON");
              }

              const priceObject = await result.json();

              console.log(`Fetched price data for ${token}:`, priceObject);

              if (!priceObject.data || !priceObject.data.length) {
                throw new Error("No price data available");
              }

              const price = priceObject.data[priceObject.data.length - 1].vwap;
              return { token, price, timedOut: false, error: false };
            } catch (error) {
              console.error(`Error fetching ${token} price:`, error);
              return { token, price: undefined, timedOut: false, error: true };
            }
          })();

          // Race between the timeout and the fetch
          return Promise.race([fetchPromise, timeoutPromise]);
        });

        const results = await Promise.all(pricePromises);
        const newPrices: TokenPrices = {};
        const newLoadingStates: TokenLoadingStates = {};
        const newErrorStates: TokenErrorStates = {};

        // Process all results at once to avoid multiple re-renders
        results.forEach(({ token, price, error }) => {
          newPrices[token] = price;
          newLoadingStates[token] = false;
          newErrorStates[token] = error;
        });

        console.log('useEkuboPrices: Fetched prices:', newPrices);

        setPrices(newPrices); // Replace entirely instead of merging
        setTokenLoadingStates(newLoadingStates);
        setTokenErrorStates(newErrorStates);
      } catch (error) {
        console.error("Error fetching prices:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, [tokensKey, selectedChainConfig.ekuboPriceAPI, isMainnet, timeoutMs, selectedChainConfig.chainId]); // Added chainId to dependencies

  return {
    prices,
    isLoading,
    isTokenLoading,
    hasTokenError,
    isTokenAvailable,
    getPrice,
  };
};
