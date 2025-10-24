import { indexAddress } from "./utils";
import { mainnetTokens } from "./mainnetTokens";
import { sepoliaTokens } from "./sepoliaTokens";
import { ChainId } from "@/dojo/setup/networks";

export function getTokenLogoUrl(
  chainId: string,
  l2TokenAddress: string
): string | undefined {
  const isMainnet = chainId === ChainId.SN_MAIN;
  const isSepolia = chainId === ChainId.SN_SEPOLIA;
  const tokens = isMainnet ? mainnetTokens : isSepolia ? sepoliaTokens : [];
  const token = tokens.find(
    (token) =>
      indexAddress(token.l2_token_address).toLowerCase() ===
      indexAddress(l2TokenAddress).toLowerCase()
  );
  return token?.logo_url;
}

export const getTokenSymbol = (
  chainId: string,
  l2TokenAddress: string
): string | undefined => {
  const isMainnet = chainId === ChainId.SN_MAIN;
  const isSepolia = chainId === ChainId.SN_SEPOLIA;
  const tokens = isMainnet ? mainnetTokens : isSepolia ? sepoliaTokens : [];
  const token = tokens.find(
    (token) =>
      indexAddress(token.l2_token_address).toLowerCase() ===
      indexAddress(l2TokenAddress).toLowerCase()
  );
  return token?.symbol;
};

export const getTokenHidden = (
  chainId: string,
  l2TokenAddress: string
): boolean | undefined => {
  const isMainnet = chainId === ChainId.SN_MAIN;
  const isSepolia = chainId === ChainId.SN_SEPOLIA;
  const tokens = isMainnet ? mainnetTokens : isSepolia ? sepoliaTokens : [];
  const token = tokens.find(
    (token) =>
      indexAddress(token.l2_token_address).toLowerCase() ===
      indexAddress(l2TokenAddress).toLowerCase()
  );
  return token?.hidden;
};

export const getTokenDecimals = (
  chainId: string,
  l2TokenAddress: string
): number => {
  const isMainnet = chainId === ChainId.SN_MAIN;
  const isSepolia = chainId === ChainId.SN_SEPOLIA;
  const tokens = isMainnet ? mainnetTokens : isSepolia ? sepoliaTokens : [];
  const token = tokens.find(
    (token) =>
      indexAddress(token.l2_token_address).toLowerCase() ===
      indexAddress(l2TokenAddress).toLowerCase()
  );
  return token?.decimals ?? 18; // Default to 18 if not found
};
