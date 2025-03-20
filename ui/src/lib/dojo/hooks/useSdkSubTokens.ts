import { useEffect, useState } from "react";
import { BigNumberish } from "starknet";
import { SubscriptionQueryType } from "@dojoengine/sdk";
import { useDojo } from "@/context/dojo";
import { SchemaType } from "@/generated/models.gen";
import { useTokenStore } from "@/hooks/tokenStore";

export type TournamentSubQuery = SubscriptionQueryType<SchemaType>;

export type TokenResult = {
  account_address: BigNumberish;
  balance: BigNumberish;
  contract_address: BigNumberish;
  token_id: BigNumberish;
};

export type UseSdkSubTokensResult = {
  tokens: TokenResult[] | null;
  isSubscribed: boolean;
  error?: Error | null;
};

export type UseSdkSubTokensProps = {
  accountAddress?: string;
  contractAddress?: string;
  logging?: boolean;
  enabled?: boolean;
};

export const useSdkSubscribeTokens = ({
  accountAddress,
  contractAddress,
  enabled = true,
}: UseSdkSubTokensProps): UseSdkSubTokensResult => {
  const { sdk } = useDojo();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [tokens, setLocalTokens] = useState<TokenResult[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const setTokens = useTokenStore((state) => state.setTokens);

  useEffect(() => {
    let _unsubscribe: (() => void) | undefined;

    const _subscribe = async () => {
      if (!accountAddress || !contractAddress) {
        setIsSubscribed(false);
        setLocalTokens(null);
        return;
      }

      try {
        const subscription = await sdk.onTokenBalanceUpdated(
          [contractAddress],
          [accountAddress],
          [],
          (tokenBalances: any) => {
            if (tokenBalances.account_address !== "0x0") {
              console.log("useSdkSubscribeTokens() response:", tokenBalances);
              setTokens(contractAddress, accountAddress, tokenBalances);
              setLocalTokens(tokenBalances.data);
            }
          }
        );

        setIsSubscribed(true);
        setError(null);
        _unsubscribe = () => subscription.cancel();
      } catch (err) {
        console.error("Failed to subscribe to entity query:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsSubscribed(false);
        setLocalTokens(null);
      }
    };

    setIsSubscribed(false);
    if (enabled && accountAddress && contractAddress) {
      _subscribe();
    } else {
      setLocalTokens(null);
    }

    return () => {
      setIsSubscribed(false);
      if (_unsubscribe) {
        try {
          _unsubscribe();
        } catch (err) {
          console.error("Error during unsubscribe:", err);
        }
      }
      _unsubscribe = undefined;
    };
  }, [sdk, accountAddress, contractAddress, enabled]);

  return {
    tokens,
    isSubscribed,
    error,
  };
};
