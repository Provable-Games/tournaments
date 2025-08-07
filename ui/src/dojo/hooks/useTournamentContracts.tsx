import { useDojoSystem } from "@/dojo/hooks/useDojoSystem";

interface ContractAddresses {
  tournamentAddress: string;
}

export function useTournamentContracts(): ContractAddresses {
  const TOURNAMENT_SYSTEM_NAME = "Budokan";

  const tournamentAddress = useDojoSystem(
    TOURNAMENT_SYSTEM_NAME
  ).contractAddress;

  return {
    tournamentAddress,
  };
}
