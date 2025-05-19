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

  // console.log(manifest);
  console.log(manifest.contracts, `${namespace}-${tag}`);

  // Find the contract in the manifest
  const contract = manifest.contracts.find(
    (contract) => contract.tag === `${namespace}-${tag}`
  );

  // console.log(contract);

  return contract?.address || null;
}
