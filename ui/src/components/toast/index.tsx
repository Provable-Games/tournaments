import { useToast } from "@/hooks/useToast";
import { XShareButton } from "@/components/ui/button";
import { formatTime, roundUSDPrice } from "@/lib/utils";

interface TournamentEntryParams {
  tournamentName: string;
  tournamentId: string;
  game: string;
  entryFeeUsdCost?: number;
  hasEntryFee: boolean;
  startsIn: number;
  duration: number;
}

interface TournamentCreationParams {
  tournamentName: string;
  tournamentId: string;
  game: string;
  entryFeeUsdCost?: number;
  hasEntryFee: boolean;
  startsIn: number;
  duration: number;
}

interface PrizeAdditionParams {
  tournamentName: string;
  tournamentId: string;
  prizeTotalUsd: number;
}

interface ToastMessages {
  showTournamentEntry: (params: TournamentEntryParams) => void;
  showTournamentCreation: (params: TournamentCreationParams) => void;
  showScoreSubmission: (tournamentName: string) => void;
  showPrizeAddition: (tournamentName: PrizeAdditionParams) => void;
  showPrizeDistribution: (tournamentName: string) => void;
}

export const useToastMessages = (): ToastMessages => {
  const { toast } = useToast();

  const showTournamentEntry: ToastMessages["showTournamentEntry"] = ({
    tournamentName,
    tournamentId,
    game,
    entryFeeUsdCost,
    hasEntryFee,
    startsIn,
    duration,
  }) => {
    toast({
      title: "Entered Tournament!",
      description: (
        <div className="flex flex-col gap-1">
          <p>Entered tournament {tournamentName}</p>
          <XShareButton
            text={[
              `I've just entered "${tournamentName}" on @budokan_gg, the onchain gaming arena.`,
              "",
              `🎮 ${game}`,
              `🎫 ${
                hasEntryFee
                  ? `Entry fee: $${roundUSDPrice(entryFeeUsdCost!)}`
                  : "Free Entry"
              }`,
              `🏁 ${startsIn <= 0 ? "Started" : `Starts in: ${formatTime(startsIn)}`}`,
              `⏳ ${startsIn <= 0 ? `Ends in: ${formatTime(duration + startsIn)}` : `Live for: ${formatTime(duration)}`}`,
              "",
              `Join here for a chance win exciting prizes: https://budokan.gg/tournament/${tournamentId}`,
            ].join("\n")}
            className="w-fit"
          />
        </div>
      ),
    });
  };

  const showTournamentCreation: ToastMessages["showTournamentCreation"] = ({
    tournamentName,
    game,
    hasEntryFee,
    entryFeeUsdCost,
    startsIn,
    duration,
    tournamentId,
  }) => {
    toast({
      title: "Created Tournament!",
      description: (
        <div className="flex flex-col gap-1">
          <p>Created tournament {tournamentName}</p>
          <XShareButton
            text={[
              `I just created tournament "${tournamentName}" on @budokan_gg, the onchain gaming arena.`,
              "",
              `🎮 ${game}`,
              `🎫 ${
                hasEntryFee
                  ? `Entry fee: $${roundUSDPrice(entryFeeUsdCost!)}`
                  : "Free Entry"
              }`,
              `🏁 ${startsIn <= 0 ? "Started" : `Starts in: ${formatTime(startsIn)}`}`,
              `⏳ ${startsIn <= 0 ? `Ends in: ${formatTime(duration + startsIn)}` : `Live for: ${formatTime(duration)}`}`,
              "",
              `Enter now: https://budokan.gg/tournament/${tournamentId}`,
            ].join("\n")}
            className="w-fit"
          />
        </div>
      ),
    });
  };

  const showScoreSubmission: ToastMessages["showScoreSubmission"] = (
    tournamentName
  ) => {
    toast({
      title: "Submitted Scores!",
      description: `Submitted scores for tournament ${tournamentName}`,
    });
  };

  const showPrizeAddition: ToastMessages["showPrizeAddition"] = ({
    tournamentName,
    tournamentId,
    prizeTotalUsd,
  }) => {
    toast({
      title: "Added Prize!",
      description: (
        <div className="flex flex-col gap-1">
          <p>Added prize to {tournamentName}</p>
          <XShareButton
            text={[
              `I just added $${prizeTotalUsd} to the prize pool for "${tournamentName}" on @budokan_gg, the onchain gaming arena.`,
              "",
              `Enter now: https://budokan.gg/tournament/${tournamentId}`,
            ].join("\n")}
            className="w-fit"
          />
        </div>
      ),
    });
  };

  const showPrizeDistribution: ToastMessages["showPrizeDistribution"] = (
    tournamentName
  ) => {
    toast({
      title: "Distributed Prizes!",
      description: `Distributed prizes for tournament ${tournamentName}`,
    });
  };

  return {
    showTournamentEntry,
    showTournamentCreation,
    showScoreSubmission,
    showPrizeAddition,
    showPrizeDistribution,
  };
};
