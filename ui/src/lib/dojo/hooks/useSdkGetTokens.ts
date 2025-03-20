import { useCallback, useEffect, useState } from "react";
import { BigNumberish } from "starknet";
import { QueryType } from "@dojoengine/sdk";
import { useDojo } from "@/context/dojo";
import { SchemaType } from "@/generated/models.gen";
import { useTokenStore } from "@/hooks/tokenStore";

export type TournamentGetQuery = QueryType<SchemaType>;

export type TokenResult = {
  account_address: BigNumberish;
  balance: BigNumberish;
  contract_address: BigNumberish;
  token_id: BigNumberish;
};

export type UseSdkGetTokensResult = {
  tokens: TokenResult[] | null;
  isLoading: boolean;
  refetch: () => void;
};

export type UseSdkGetTokenResult = {
  isLoading: boolean;
  refetch: () => void;
};

export type UseSdkGetTokensProps = {
  accountAddress?: string;
  contractAddress?: string;
  enabled?: boolean;
  updateStore?: boolean;
};

export const useSdkGetTokens = ({
  accountAddress,
  contractAddress,
  enabled = true,
  updateStore = true,
}: UseSdkGetTokensProps): UseSdkGetTokensResult => {
  const { sdk } = useDojo();
  const setTokens = useTokenStore((state) => state.setTokens);

  const [isLoading, setIsLoading] = useState(false);
  const [tokens, setLocalTokens] = useState<TokenResult[] | null>(null);

  const fetchTokens = useCallback(async () => {
    if (!contractAddress || !accountAddress) {
      setLocalTokens(null);
      return;
    }

    setIsLoading(true);
    try {
      const fetchedTokens = await sdk.getTokenBalances(
        [contractAddress],
        [accountAddress],
        []
      );

      setLocalTokens(fetchedTokens);

      if (updateStore && fetchedTokens) {
        setTokens(contractAddress, accountAddress, fetchedTokens);
      }
    } catch (error) {
      console.error("useSdkGetTokens() exception:", error);
      setLocalTokens(null);
    } finally {
      setIsLoading(false);
    }
  }, [sdk, accountAddress, contractAddress]);

  useEffect(() => {
    if (enabled) {
      fetchTokens();
    }
  }, [fetchTokens, enabled]);

  return {
    tokens,
    isLoading,
    refetch: fetchTokens,
  };
};
