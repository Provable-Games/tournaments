import { create } from "zustand";
import { TokenResult } from "@/lib/dojo/hooks/useSdkGetTokens";

interface TokenState {
  tokens: Record<string, TokenResult[]>; // Keyed by contract address
  setTokens: (
    contractAddress: string,
    accountAddress: string,
    tokens: TokenResult[]
  ) => void;
  getTokens: (
    contractAddress?: string,
    accountAddress?: string
  ) => TokenResult[];
  clearTokens: () => void;
}

export const useTokenStore = create<TokenState>((set, get) => ({
  tokens: {},

  setTokens: (contractAddress, accountAddress, tokens) => {
    set((state) => {
      // Create a unique key for this contract+account combination
      const key = `${contractAddress}:${accountAddress}`;

      return {
        tokens: {
          ...state.tokens,
          [key]: tokens,
        },
      };
    });
  },

  getTokens: (contractAddress, accountAddress) => {
    if (!contractAddress || !accountAddress) return [];

    const key = `${contractAddress}:${accountAddress}`;
    return get().tokens[key] || [];
  },

  clearTokens: () => {
    set({ tokens: {} });
  },
}));
