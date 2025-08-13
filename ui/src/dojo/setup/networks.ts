import {
  Chain,
  mainnet,
  sepolia,
  NativeCurrency,
} from "@starknet-react/chains";
import { stringToFelt } from "@/lib/utils";
import { supportedConnectorIds } from "@/lib/connectors";
import {
  LOCAL_KATANA,
  LOCAL_RELAY,
  KATANA_CLASS_HASH,
  KATANA_ETH_CONTRACT_ADDRESS,
} from "@dojoengine/core";

export enum ChainId {
  KATANA_LOCAL = "KATANA_LOCAL",
  WP_PG_SLOT_2 = "WP_PG_SLOT_2",
  SN_MAIN = "SN_MAIN",
  SN_SEPOLIA = "SN_SEPOLIA",
}

export enum NetworkId {
  KATANA_LOCAL = "KATANA_LOCAL",
  WP_PG_SLOT_2 = "SLOT",
  SN_MAIN = "MAINNET",
  SN_SEPOLIA = "SEPOLIA",
}

//
// currencies
//
const ETH_KATANA: NativeCurrency = {
  address: KATANA_ETH_CONTRACT_ADDRESS,
  name: "Ether",
  symbol: "ETH",
  decimals: 18,
};

//
// explorers
//
type ChainExplorers = {
  [key: string]: string[];
};
const WORLD_EXPLORER: ChainExplorers = {
  worlds: ["https://worlds.dev"],
};

//
// chain config
//
export type DojoChainConfig = {
  chain?: Chain;
  chainId?: ChainId;
  name?: string;
  rpcUrl?: string;
  toriiUrl?: string;
  toriiTokensUrl?: string;
  relayUrl?: string;
  blastRpc?: string;
  blockExplorerUrl?: string;
  ekuboPriceAPI?: string;
  masterAddress?: string;
  masterPrivateKey?: string;
  accountClassHash?: string;
  ethAddress?: string;
  connectorIds?: string[];
  // starknet Chain
  network?: string;
  testnet?: boolean;
  nativeCurrency?: NativeCurrency;
  explorers?: ChainExplorers;
  denshokanAddress?: string;
};

const localKatanaConfig: DojoChainConfig = {
  chain: undefined, // derive from this
  chainId: ChainId.KATANA_LOCAL,
  name: "Katana Local",
  rpcUrl: LOCAL_KATANA,
  toriiUrl: "http://localhost:8080", //LOCAL_TORII,
  toriiTokensUrl: "http://localhost:8080",
  relayUrl: LOCAL_RELAY,
  blastRpc: undefined,
  blockExplorerUrl: undefined,
  ekuboPriceAPI: undefined,
  masterAddress:
    "0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec",
  masterPrivateKey:
    "0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912",
  accountClassHash: KATANA_CLASS_HASH,
  ethAddress: KATANA_ETH_CONTRACT_ADDRESS,
  connectorIds: [supportedConnectorIds.PREDEPLOYED],
  // starknet Chain
  nativeCurrency: ETH_KATANA,
  explorers: WORLD_EXPLORER,
} as const;

const slotKatanaConfig: DojoChainConfig = {
  chain: undefined, // derive from this
  chainId: ChainId.WP_PG_SLOT_2,
  name: "PG Slot",
  rpcUrl: "https://api.cartridge.gg/x/pg-slot-2/katana",
  toriiUrl: "https://api.cartridge.gg/x/pg-slot-2/torii",
  toriiTokensUrl: "",
  relayUrl: undefined,
  blastRpc: undefined,
  blockExplorerUrl: undefined,
  ekuboPriceAPI: "https://mainnet-api.ekubo.org/price",
  masterAddress:
    "0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec",
  masterPrivateKey:
    "0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912",
  accountClassHash: KATANA_CLASS_HASH,
  ethAddress: KATANA_ETH_CONTRACT_ADDRESS,
  connectorIds: [supportedConnectorIds.CONTROLLER],
  // starknet Chain
  nativeCurrency: ETH_KATANA,
  explorers: WORLD_EXPLORER,
};

const snSepoliaConfig: DojoChainConfig = {
  chain: { ...sepolia },
  chainId: ChainId.SN_SEPOLIA,
  name: "Starknet Sepolia",
  rpcUrl: "https://api.cartridge.gg/x/starknet/sepolia",
  toriiUrl: "https://api.cartridge.gg/x/pg-sepolia-2/torii",
  toriiTokensUrl: "",
  relayUrl: undefined,
  blastRpc: undefined,
  blockExplorerUrl: "https://sepolia.voyager.online",
  ekuboPriceAPI: "https://sepolia-api.ekubo.org/price",
  // masterAddress: KATANA_PREFUNDED_ADDRESS,
  // masterPrivateKey: KATANA_PREFUNDED_PRIVATE_KEY,
  masterAddress: undefined,
  masterPrivateKey: undefined,
  accountClassHash: undefined,
  ethAddress: sepolia.nativeCurrency.address,
  connectorIds: [supportedConnectorIds.CONTROLLER],
  denshokanAddress:
    "0x06a1102ed881e0d6d689295db5819dd1d15f0d55cbe10e1b87587c2ea1ec8da4",
};

const snMainnetConfig: DojoChainConfig = {
  chain: { ...mainnet },
  chainId: ChainId.SN_MAIN,
  name: "Mainnet",
  rpcUrl: "https://api.cartridge.gg/x/starknet/mainnet",
  toriiUrl: "https://api.cartridge.gg/x/pg-mainnet/torii",
  toriiTokensUrl: "https://api.cartridge.gg/x/pg-mainnet-tokens/torii",
  relayUrl: undefined,
  blastRpc:
    "https://starknet-mainnet.blastapi.io/5ef61753-e7c1-4593-bc62-97fdf96f8de5",
  blockExplorerUrl: "https://voyager.online",
  ekuboPriceAPI: "https://mainnet-api.ekubo.org/price",
  masterAddress: undefined,
  masterPrivateKey: undefined,
  accountClassHash: undefined,
  ethAddress: mainnet.nativeCurrency.address,
  connectorIds: [supportedConnectorIds.CONTROLLER],
} as const;

//--------------------------------
// Available chains
//

const makeDojoChainConfig = (config: DojoChainConfig): DojoChainConfig => {
  let chain = { ...config };
  //
  // derive starknet Chain
  if (!chain.chain) {
    chain.chain = {
      id: BigInt(stringToFelt(chain.chainId ?? "")),
      name: chain.name,
      network: chain.network ?? "katana",
      testnet: chain.testnet ?? true,
      nativeCurrency: chain.nativeCurrency,
      rpcUrls: {
        default: { http: [] },
        public: { http: [] },
      },
      paymasterRpcUrls: {
        default: { http: [] },
        public: { http: [] },
      },
      explorers: chain.explorers,
    } as Chain;
  }
  //
  // use Cartridge RPCs
  if (chain.rpcUrl) {
    chain.chain.rpcUrls.default.http = [chain.rpcUrl];
    chain.chain.rpcUrls.public.http = [chain.rpcUrl];
  }

  return chain;
};

export const CHAINS: Record<ChainId, DojoChainConfig> = {
  [ChainId.SN_MAIN]: makeDojoChainConfig(snMainnetConfig),
  [ChainId.SN_SEPOLIA]: makeDojoChainConfig(snSepoliaConfig),
  [ChainId.WP_PG_SLOT_2]: makeDojoChainConfig(slotKatanaConfig),
  [ChainId.KATANA_LOCAL]: makeDojoChainConfig(localKatanaConfig),
};

export const getDefaultChainId = (): ChainId => {
  const envChainId = import.meta.env.VITE_CHAIN_ID as ChainId;

  if (envChainId && !isChainIdSupported(envChainId)) {
    throw new Error(`Unsupported chain ID in environment: ${envChainId}`);
  }

  return envChainId || ChainId.KATANA_LOCAL;
};

const isChainIdSupported = (chainId: ChainId): boolean => {
  return Object.keys(CHAINS).includes(chainId);
};
