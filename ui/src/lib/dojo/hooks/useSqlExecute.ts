import { useState, useEffect } from "react";
import { useDojo } from "@/context/dojo";

export function useSqlExecute(query: string | null, tokens?: boolean) {
  const { selectedChainConfig } = useDojo();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);

  const fetchData = async () => {
    if (query === null) {
      setLoading(false);
      setError(null);
      setData([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (!selectedChainConfig?.toriiUrl) {
        throw new Error("toriiUrl is not configured for the selected chain");
      }

      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `${
          tokens
            ? selectedChainConfig.toriiTokensUrl
            : selectedChainConfig.toriiUrl
        }/sql?query=${encodedQuery}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();
      if (!response.ok) {
        let errorMessage = "Failed to execute query";

        if (result.error) {
          if (typeof result.error === "string") {
            errorMessage = result.error;
          } else if (typeof result.error === "object") {
            errorMessage = result.error.message || JSON.stringify(result.error);
          }
        }

        throw new Error(errorMessage);
      }

      setData(result);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [query, selectedChainConfig?.toriiUrl]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
