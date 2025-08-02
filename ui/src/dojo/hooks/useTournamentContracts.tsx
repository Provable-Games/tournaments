import { useDojoSystem } from "@/dojo/hooks/useDojoSystem";
import { useDojo } from "@/context/dojo";
import { ChainId } from "@/dojo/setup/networks";

interface ContractAddresses {
  tournamentAddress: string;
}

export function useTournamentContracts(): ContractAddresses {
  const { selectedChainConfig } = useDojo();

  const isMainnet = selectedChainConfig.chainId === ChainId.SN_MAIN;
  const isSepolia = selectedChainConfig.chainId === ChainId.SN_SEPOLIA;

  const TOURNAMENT_SYSTEM_NAME = "Budokan";

  const tournamentAddress = useDojoSystem(
    TOURNAMENT_SYSTEM_NAME
  ).contractAddress;

  return {
    tournamentAddress,
  };
}
