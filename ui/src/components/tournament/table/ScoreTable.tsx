import Pagination from "@/components/table/Pagination";
import { USER } from "@/components/Icons";
import { useState, useMemo, useEffect } from "react";
import { BigNumberish } from "starknet";
import { useSubscribeGameTokens } from "metagame-sdk";
import { useGetUsernames } from "@/hooks/useController";
import { MobilePlayerCard } from "@/components/tournament/table/PlayerCard";
import {
  TournamentCard,
  TournamentCardHeader,
  TournamentCardContent,
  TournamentCardTitle,
  TournamentCardMetric,
  TournamentCardSwitch,
} from "@/components/tournament/containers/TournamentCard";
import ScoreRow from "@/components/tournament/table/ScoreRow";
import EntrantRow from "@/components/tournament/table/EntrantRow";
import { useTournamentContracts } from "@/dojo/hooks/useTournamentContracts";
import { padAddress } from "@/lib/utils";

interface ScoreTableProps {
  tournamentId: BigNumberish;
  entryCount: number;
  gameAddress: BigNumberish;
  isStarted: boolean;
  isEnded: boolean;
}

const ScoreTable = ({
  tournamentId,
  entryCount,
  gameAddress,
  isStarted,
  isEnded,
}: ScoreTableProps) => {
  const [showScores, setShowScores] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const { tournamentAddress } = useTournamentContracts();

  const {
    games,
    pagination: {
      currentPage,
      hasNextPage,
      hasPreviousPage,
      goToPage,
      nextPage,
      previousPage,
    },
  } = useSubscribeGameTokens({
    context: {
      name: "Budokan",
      attributes: {
        "Tournament ID": tournamentId?.toString() ?? "0",
      },
    },
    pagination: {
      pageSize: 10,
      sortBy: "score",
      sortOrder: "desc",
    },
    minted_by_address: padAddress(tournamentAddress),
  });

  const ownerAddresses = useMemo(
    () => games?.map((game) => game?.owner ?? "0x0"),
    [games]
  );
  const { usernames } = useGetUsernames(ownerAddresses ?? []);

  useEffect(() => {
    if (games.length > 0) {
      setShowScores(true);
    }
  }, []);

  return (
    <TournamentCard showCard={showScores}>
      <TournamentCardHeader>
        <TournamentCardTitle>
          {isStarted ? "Scores" : "Entrants"}
        </TournamentCardTitle>
        {showScores && entryCount > 10 && (
          <Pagination
            totalPages={Math.ceil(entryCount / 10)}
            currentPage={currentPage}
            nextPage={nextPage}
            previousPage={previousPage}
            hasNextPage={hasNextPage}
            hasPreviousPage={hasPreviousPage}
            goToPage={goToPage}
          />
        )}
        <div className="flex flex-row items-center gap-2">
          <TournamentCardSwitch
            checked={showScores}
            onCheckedChange={setShowScores}
            showSwitch={entryCount > 0}
            notShowingSwitchLabel="No scores"
            checkedLabel="Hide"
            uncheckedLabel="Show Scores"
          />
          <TournamentCardMetric icon={<USER />} metric={entryCount} />
        </div>
      </TournamentCardHeader>
      <TournamentCardContent showContent={showScores}>
        {/* {!loading ? ( */}
        <div className="flex flex-row py-2">
          {[0, 1].map((colIndex) => (
            <div
              key={colIndex}
              className={`flex flex-col w-1/2 relative ${
                colIndex === 0 ? "pr-3" : "pl-3"
              }`}
            >
              {colIndex === 0 && games.length > 5 && (
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-brand/25 h-full" />
              )}
              {games
                ?.slice(colIndex * 5, colIndex * 5 + 5)
                .map((registration, index) => (
                  <>
                    {isStarted ? (
                      <ScoreRow
                        key={index}
                        index={index}
                        gameAddress={gameAddress}
                        tokenId={registration?.token_id}
                        colIndex={colIndex}
                        currentPage={currentPage}
                        game={games?.[index + colIndex * 5]}
                        usernames={usernames}
                        isEnded={isEnded}
                        setSelectedPlayer={setSelectedPlayer}
                        setIsMobileDialogOpen={setIsMobileDialogOpen}
                      />
                    ) : (
                      <EntrantRow
                        key={index}
                        game={games?.[index + colIndex * 5]}
                        index={index}
                        colIndex={colIndex}
                        currentPage={currentPage}
                        setSelectedPlayer={setSelectedPlayer}
                        setIsMobileDialogOpen={setIsMobileDialogOpen}
                        usernames={usernames}
                      />
                    )}
                  </>
                ))}
            </div>
          ))}
        </div>
        {/* ) : (
          <TableSkeleton entryCount={entryCount} offset={offset} />
        )} */}
      </TournamentCardContent>

      {/* Mobile dialog for player details */}
      <MobilePlayerCard
        open={isMobileDialogOpen}
        onOpenChange={setIsMobileDialogOpen}
        selectedPlayer={selectedPlayer}
        usernames={usernames}
        ownerAddress={ownerAddresses?.[selectedPlayer?.index ?? 0]}
        isEnded={isEnded}
      />
    </TournamentCard>
  );
};

export default ScoreTable;
