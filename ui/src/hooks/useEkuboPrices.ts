import { useState, useEffect } from "react";
import { useDojo } from "@/context/dojo";

interface TokenPrice {
  [key: string]: bigint | undefined;
}

interface EkuboPriceProps {
  tokens: string[];
}

export const useEkuboPrices = ({ tokens }: EkuboPriceProps) => {
  const { selectedChainConfig } = useDojo();
  const [prices, setPrices] = useState<TokenPrice>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const pricePromises = tokens.map(async (token) => {
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

            if (!priceObject.data || !priceObject.data.length) {
              throw new Error("No price data available");
            }

            return {
              token,
              price: priceObject.data[priceObject.data.length - 1].vwap,
            };
          } catch (error) {
            console.error(`Error fetching ${token} price:`, error);
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, [tokens.join(","), selectedChainConfig.ekuboPriceAPI]); // Using join to create a stable dependency

  return {
    prices,
    isLoading,
    getPrice: (token: string) => prices[token],
  };
};
