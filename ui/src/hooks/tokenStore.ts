import { create } from "zustand";
import { TokenResult } from "@/lib/dojo/hooks/useSdkGetTokens";
import { useEffect, useState } from "react";

interface TokenState {
  allTokens: Record<string, TokenResult[]>; // Keyed by contract:account
  setTokens: (
    contractAddress: string,
    accountAddress: string,
    tokens: TokenResult[]
  ) => void;
  addToken: (
    contractAddress: string,
    accountAddress: string,
    token: TokenResult
  ) => void;
  clearTokens: () => void;
}

export const useTokenStore = create<TokenState>((set, get) => ({
  allTokens: {},

  setTokens: (contractAddress, accountAddress, tokens) => {
    if (!contractAddress || !accountAddress) return;

    const key = `${contractAddress}:${accountAddress}`;

    set((state) => ({
      allTokens: {
        ...state.allTokens,
        [key]: tokens,
      },
    }));
  },

  addToken: (contractAddress, accountAddress, token) => {
    if (!contractAddress || !accountAddress) return;

    const key = `${contractAddress}:${accountAddress}`;
    const currentTokens = get().allTokens[key] || [];

    // Check if token already exists by token_id
    const tokenExists = currentTokens.some(
      (existingToken) => existingToken.token_id === token.token_id
    );

    // If token doesn't exist, add it to the array
    if (!tokenExists) {
      set((state) => ({
        allTokens: {
          ...state.allTokens,
          [key]: [...currentTokens, token],
        },
      }));
    } else {
      // If token exists, update it (replace with new version)
      set((state) => ({
        allTokens: {
          ...state.allTokens,
          [key]: currentTokens.map((existingToken) =>
            existingToken.token_id === token.token_id ? token : existingToken
          ),
        },
      }));
    }
  },

  clearTokens: () => {
    set({ allTokens: {} });
  },
}));

// Create a completely separate hook that doesn't use selectors
export const useTokensByAddresses = (
  contractAddress?: string,
  accountAddress?: string
) => {
  const [tokens, setTokens] = useState<TokenResult[]>([]);
  const allTokens = useTokenStore((state) => state.allTokens);

  useEffect(() => {
    if (!contractAddress || !accountAddress) {
      setTokens([]);
      return;
    }

    const key = `${contractAddress}:${accountAddress}`;
    setTokens(allTokens[key] || []);
  }, [contractAddress, accountAddress, allTokens]);

  return tokens;
};
