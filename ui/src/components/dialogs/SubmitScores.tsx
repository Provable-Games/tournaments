import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useSystemCalls } from "@/dojo/hooks/useSystemCalls";
import { useAccount } from "@starknet-react/core";
import { Leaderboard, Tournament } from "@/generated/models.gen";
import { padAddress, feltToString, getOrdinalSuffix } from "@/lib/utils";
import { useConnectToSelectedChain } from "@/dojo/hooks/useChain";
import { useSubscribeGameTokens } from "metagame-sdk";
import { getSubmittableScores } from "@/lib/utils/formatting";
import { useState } from "react";
import { LoadingSpinner } from "@/components/ui/spinner";
import { useTournamentContracts } from "@/dojo/hooks/useTournamentContracts";

interface SubmitScoresDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentModel: Tournament;
  leaderboard: Leaderboard;
}

export function SubmitScoresDialog({
  open,
  onOpenChange,
  tournamentModel,
  leaderboard,
}: SubmitScoresDialogProps) {
  const { address } = useAccount();
  const { connect } = useConnectToSelectedChain();
  const { submitScores } = useSystemCalls();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tournamentAddress } = useTournamentContracts();

  const leaderboardSize = Number(tournamentModel?.game_config.prize_spots);

  const { games } = useSubscribeGameTokens({
    context: {
      name: "Budokan",
      attributes: {
        "Tournament ID": tournamentModel?.id?.toString() ?? "0",
      },
    },
    pagination: {
      pageSize: leaderboardSize,
      sortBy: "score",
      sortOrder: "desc",
    },
    minted_by_address: padAddress(tournamentAddress),
  });

  const submittableScores = getSubmittableScores(games, leaderboard);

  const handleSubmitScores = async () => {
    setIsSubmitting(true);
    try {
      await submitScores(
        tournamentModel?.id,
        feltToString(tournamentModel?.metadata.name),
        submittableScores
      );
      setIsSubmitting(false);
    } catch (error) {
      console.error("Failed to submit scores:", error);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit Scores</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <span className="text-center">
            Submitting {submittableScores.length} scores
          </span>
          <div className="space-y-2 px-5 py-2 max-h-[300px] overflow-y-auto">
            {games?.map((game, index) => (
              <div className="flex flex-row items-center gap-5" key={index}>
                <span className="font-brand w-10">
                  {index + 1}
                  {getOrdinalSuffix(index + 1)}
                </span>
                <span>{game.player_name}</span>
                <p
                  className="flex-1 h-[2px] bg-repeat-x"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, currentColor 1px, transparent 1px)",
                    backgroundSize: "8px 8px",
                    backgroundPosition: "0 center",
                  }}
                ></p>
                <span className="font-brand">{game.score}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          {address ? (
            <Button
              disabled={!address || isSubmitting}
              onClick={handleSubmitScores}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner />
                  <span>Submitting...</span>
                </div>
              ) : (
                "Submit"
              )}
            </Button>
          ) : (
            <Button onClick={() => connect()}>Connect Wallet</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
