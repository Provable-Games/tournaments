import { useEffect, useRef } from "react";
import { useNetwork, useAccount } from "@starknet-react/core";
import { feltToString } from "@/lib/utils";
import { ChainId } from "@/dojo/setup/networks";
import { getNetworkFromUrl } from "@/lib/networkUrl";
import { useSwitchNetwork } from "./useChain";

/**
 * Hook to detect network from URL on initial load and switch if needed
 * This ensures that ?network=sepolia URLs load sepolia data
 * and URLs without network param load mainnet data
 */
export const useInitialNetworkFromUrl = () => {
  const { chain } = useNetwork();
  const { isConnected } = useAccount();
  const { switchToMainnet, switchToSepolia } = useSwitchNetwork();
  const hasInitialized = useRef(false);

  useEffect(() => {
    console.log("[useInitialNetworkFromUrl] Effect running, hasInitialized:", hasInitialized.current, "isConnected:", isConnected);

    // Only run once on mount
    if (hasInitialized.current) return;

    // Wait for wallet connection before attempting network switch
    if (!isConnected) {
      console.log("[useInitialNetworkFromUrl] Wallet not connected yet, waiting...");
      return;
    }

    // Only proceed if we have chain info
    if (!chain) {
      console.log("[useInitialNetworkFromUrl] No chain yet, waiting...");
      return;
    }

    const currentChainId = feltToString(chain.id) as ChainId;
    const urlNetworkId = getNetworkFromUrl();

    console.log("[useInitialNetworkFromUrl] Current chain:", currentChainId);
    console.log("[useInitialNetworkFromUrl] URL network:", urlNetworkId);

    // Only handle mainnet and sepolia
    if (
      currentChainId !== ChainId.SN_MAIN &&
      currentChainId !== ChainId.SN_SEPOLIA
    ) {
      console.log("[useInitialNetworkFromUrl] Not on mainnet/sepolia, skipping");
      hasInitialized.current = true;
      return;
    }

    // If URL and wallet network don't match, switch wallet to match URL
    if (urlNetworkId !== currentChainId) {
      console.log(
        `[useInitialNetworkFromUrl] Network mismatch: URL expects ${urlNetworkId}, wallet is on ${currentChainId}. Switching...`
      );

      if (urlNetworkId === ChainId.SN_SEPOLIA) {
        switchToSepolia().catch((err) => {
          console.error("Failed to switch to Sepolia:", err);
        });
      } else if (urlNetworkId === ChainId.SN_MAIN) {
        switchToMainnet().catch((err) => {
          console.error("Failed to switch to Mainnet:", err);
        });
      }
    } else {
      console.log("[useInitialNetworkFromUrl] Networks match, no switch needed");
    }

    hasInitialized.current = true;
  }, [chain, isConnected, switchToMainnet, switchToSepolia]);
};
