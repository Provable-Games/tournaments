import tournament_manifest_mainnet from "../../../../contracts/manifest_mainnet.json";
import tournament_manifest_sepolia from "../../../../contracts/manifest_sepolia.json";

// Define the network type
type Network = "mainnet" | "sepolia";

const networks = {
  mainnet: tournament_manifest_mainnet,
  sepolia: tournament_manifest_sepolia,
} as const;

export function getAddress(
  namespace: string,
  tag: string,
  network: Network = "mainnet" // Make network parameter optional with default value
): string | null {
  const manifest = networks[network];

  // Find the contract in the manifest
  const contract = manifest.contracts.find(
    (contract) => contract.tag === `${namespace}-${tag}`
  );

  return contract?.address || null;
}

export function displayAddress(string: string) {
  if (string === undefined) return "unknown";
  return string.substring(0, 6) + "..." + string.substring(string.length - 4);
}
