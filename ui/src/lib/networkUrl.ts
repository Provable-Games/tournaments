import { ChainId } from "@/dojo/setup/networks";

/**
 * Get the network from URL parameter
 * @returns ChainId.SN_SEPOLIA if ?network=sepolia, otherwise ChainId.SN_MAIN
 */
export const getNetworkFromUrl = (): ChainId => {
  const params = new URLSearchParams(window.location.search);
  const networkParam = params.get("network");

  if (networkParam === "sepolia") {
    return ChainId.SN_SEPOLIA;
  }

  // Default to mainnet for any other value or no param
  return ChainId.SN_MAIN;
};

/**
 * Update the URL with network parameter based on current chain
 * @param chainId - The ChainId to reflect in URL
 */
export const updateNetworkInUrl = (chainId: ChainId): void => {
  const params = new URLSearchParams(window.location.search);

  // Only add ?network=sepolia for Sepolia, remove param for mainnet
  if (chainId === ChainId.SN_SEPOLIA) {
    params.set("network", "sepolia");
  } else {
    params.delete("network");
  }

  const newUrl = params.toString()
    ? `${window.location.pathname}?${params.toString()}`
    : window.location.pathname;

  window.history.replaceState({}, "", newUrl);
};
