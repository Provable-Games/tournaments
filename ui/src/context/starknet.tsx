"use client";
import { useEffect, useState, useMemo } from "react";
import { Chain } from "@starknet-react/chains";
import {
  jsonRpcProvider,
  StarknetConfig,
  argent,
  braavos,
} from "@starknet-react/core";
import React from "react";
import { ChainId, CHAINS, getDefaultChainId } from "@/dojo/setup/networks";
import {
  predeployedAccounts,
  PredeployedAccountsConnector,
} from "@dojoengine/predeployed-connector";
import { initializeController } from "@/dojo/setup/controllerSetup";
import { manifests } from "@/dojo/setup/config";

// Initialize controller outside component
const initController = () => {
  if (getDefaultChainId() === ChainId.KATANA_LOCAL) {
    return undefined;
  }

  try {
    const chainRpcUrls: { rpcUrl: string }[] = Object.values(CHAINS)
      .filter((chain) => chain.chainId !== ChainId.KATANA_LOCAL)
      .map((chain) => ({
        rpcUrl: chain?.chain?.rpcUrls.default.http[0] ?? "",
      }));

    return initializeController(
      chainRpcUrls,
      getDefaultChainId(),
      manifests[getDefaultChainId()]
    );
  } catch (error) {
    console.error(
      `Failed to initialize controller for chain ${getDefaultChainId()}:`,
      error
    );
    return undefined;
  }
};

// Initialize controller once
const controller = initController();

export function StarknetProvider({ children }: { children: React.ReactNode }) {
  const [predeployedConnectors, setPredeployedConnectors] = useState<
    PredeployedAccountsConnector[]
  >([]);
  const defaultChainId = getDefaultChainId();

  // Create provider with memoization
  const provider = jsonRpcProvider({
    rpc: (chain: Chain) => {
      switch (chain) {
        case CHAINS[ChainId.SN_MAIN].chain:
          return {
            nodeUrl: CHAINS[ChainId.SN_MAIN].chain?.rpcUrls.default.http[0],
          };
        case CHAINS[ChainId.SN_SEPOLIA].chain:
          return {
            nodeUrl: CHAINS[ChainId.SN_SEPOLIA].chain?.rpcUrls.default.http[0],
          };
        case CHAINS[ChainId.WP_PG_SLOT_2].chain:
          return {
            nodeUrl:
              CHAINS[ChainId.WP_PG_SLOT_2].chain?.rpcUrls.default.http[0],
          };
        case CHAINS[ChainId.KATANA_LOCAL].chain:
          return {
            nodeUrl:
              CHAINS[ChainId.KATANA_LOCAL].chain?.rpcUrls.default.http[0],
          };
        default:
          throw new Error(`Unsupported chain: ${chain.network}`);
      }
    },
  });

  // Initialize predeployed accounts for Katana
  useEffect(() => {
    if (defaultChainId === ChainId.KATANA_LOCAL) {
      const rpcUrl = CHAINS[defaultChainId]?.chain?.rpcUrls.default.http[0];
      if (rpcUrl) {
        predeployedAccounts({
          rpc: rpcUrl,
          id: "katana",
          name: "Katana",
        }).then(setPredeployedConnectors);
      }
    }
  }, [defaultChainId]);

  // Prepare chains based on environment
  const chains = useMemo(() => {
    if (defaultChainId === ChainId.KATANA_LOCAL) {
      return [CHAINS[ChainId.KATANA_LOCAL].chain!];
    }

    return Object.values(CHAINS)
      .map((chain) => chain.chain!)
      .filter(Boolean); // Filter out any undefined chains
  }, [defaultChainId]);

  // Combine all available connectors
  const connectors = useMemo(() => {
    const availableConnectors = [];

    if (getDefaultChainId() !== ChainId.KATANA_LOCAL && controller) {
      availableConnectors.push(controller);
      availableConnectors.push(argent());
      availableConnectors.push(braavos());
    }

    return [...availableConnectors, ...predeployedConnectors].filter(Boolean);
  }, [predeployedConnectors]);

  // Get default provider chain
  const defaultChain = CHAINS[defaultChainId]?.chain;

  if (!defaultChain) {
    console.error(`No chain configuration found for ${defaultChainId}`);
    return null;
  }

  return (
    <StarknetConfig
      autoConnect
      chains={chains}
      connectors={connectors}
      provider={provider}
    >
      {children}
    </StarknetConfig>
  );
}
