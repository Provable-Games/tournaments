import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { getEntityIdFromKeys } from "@dojoengine/utils";
import { useDojo } from "@/context/dojo";
import { TOURNAMENT_VERSION_KEY } from "@/lib/constants";
import { bigintToHex } from "@/lib/utils";
import { addAddressPadding, BigNumberish } from "starknet";

export const useEntityUpdates = () => {
  const { namespace } = useDojo();
  const state = useDojoStore((state) => state);

  const waitForTournamentCreation = async (totalTournaments: number) => {
    const platformMetricsEntityId = getEntityIdFromKeys([
      BigInt(TOURNAMENT_VERSION_KEY),
    ]);
    await state.waitForEntityChange(
      platformMetricsEntityId,
      (entity) => {
        return (
          entity?.models?.[namespace]?.PlatformMetrics?.total_tournaments ==
          addAddressPadding(bigintToHex(BigInt(Number(totalTournaments))))
        );
      },
      20000
    );
  };

  const waitForTournamentEntry = async (
    tournamentId: BigNumberish,
    entryCount: number
  ) => {
    const entryCountEntityId = getEntityIdFromKeys([BigInt(tournamentId)]);
    await state.waitForEntityChange(
      entryCountEntityId,
      (entity) => {
        return (
          entity?.models?.[namespace]?.EntryCount?.count ==
          addAddressPadding(bigintToHex(BigInt(Number(entryCount) + 1)))
        );
      },
      20000
    );
  };

  const waitForAddPrizes = async (prizeCount: number) => {
    const prizeMetricsEntityId = getEntityIdFromKeys([
      BigInt(TOURNAMENT_VERSION_KEY),
    ]);
    await state.waitForEntityChange(
      prizeMetricsEntityId,
      (entity) => {
        return (
          entity?.models?.[namespace]?.PrizeMetrics?.total_prizes ==
          addAddressPadding(bigintToHex(BigInt(prizeCount)))
        );
      },
      20000
    );
  };

  const waitForSubmitScores = async (tournamentId: BigNumberish) => {
    const tournamentLeaderboardEntityId = getEntityIdFromKeys([
      BigInt(tournamentId),
    ]);
    await state.waitForEntityChange(
      tournamentLeaderboardEntityId,
      () => {
        return true;
      },
      20000
    );
  };

  return {
    waitForTournamentCreation,
    waitForTournamentEntry,
    waitForAddPrizes,
    waitForSubmitScores,
  };
};
