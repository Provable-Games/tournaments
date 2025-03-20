import { Card } from "@/components/ui/card";
import Pagination from "@/components/table/Pagination";
import { USER, VERIFIED } from "@/components/Icons";
import { useState, useEffect, useMemo } from "react";
import { Switch } from "@/components/ui/switch";
import { addAddressPadding, BigNumberish } from "starknet";
import { useGetTournamentLeaderboard } from "@/dojo/hooks/useSqlQueries";
import { feltToString, indexAddress, bigintToHex } from "@/lib/utils";
import { useDojo } from "@/context/dojo";
import { useGetUsernames } from "@/hooks/useController";
import { HoverCardContent } from "@/components/ui/hover-card";
import { HoverCard } from "@/components/ui/hover-card";
import { HoverCardTrigger } from "@/components/ui/hover-card";
import {
  MobilePlayerCard,
  PlayerDetails,
} from "@/components/tournament/table/PlayerCard";
import TableSkeleton from "@/components/tournament/table/Skeleton";
import { Leaderboard } from "@/generated/models.gen";

interface ScoreTableProps {
  tournamentId: BigNumberish;
  entryCount: number;
  gameAddress: BigNumberish;
  gameNamespace: string;
  gameScoreModel: string;
  gameScoreAttribute: string;
  isEnded: boolean;
  leaderboardModel: Leaderboard;
}

const ScoreTable = ({
  tournamentId,
  entryCount,
  gameAddress,
  gameNamespace,
  gameScoreModel,
  gameScoreAttribute,
  isEnded,
  leaderboardModel,
}: ScoreTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showParticipants, setShowParticipants] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const { nameSpace } = useDojo();
  const [prevEntryCount, setPrevEntryCount] = useState<number | null>(null);
  const [prevSubmissionsKey, setPrevSubmissionsKey] = useState<string | null>(
    null
  );
  const offset = (currentPage - 1) * 10;

  const {
    data: leaderboard,
    refetch: refetchLeaderboard,
    loading,
  } = useGetTournamentLeaderboard({
    namespace: nameSpace,
    tournamentId: addAddressPadding(bigintToHex(tournamentId)),
    gameNamespace: gameNamespace,
    gameAddress: indexAddress(gameAddress?.toString() ?? "0x0"),
    gameScoreModel: gameScoreModel,
    gameScoreAttribute: gameScoreAttribute,
    limit: 10,
    offset: offset,
  });

  const ownerAddresses = useMemo(
    () => leaderboard?.map((registration) => registration?.account_address),
    [leaderboard]
  );

  const submissionsKey = useMemo(
    () => leaderboardModel?.token_ids.join(","),
    [leaderboardModel]
  );

  useEffect(() => {
    if (
      prevEntryCount !== null &&
      prevEntryCount !== entryCount &&
      prevSubmissionsKey !== null &&
      submissionsKey !== prevSubmissionsKey
    ) {
      const timer = setTimeout(() => {
        refetchLeaderboard();
        console.log("refetching leaderboard");
      }, 1000);

      return () => clearTimeout(timer);
    }

    setPrevEntryCount(entryCount);
    setPrevSubmissionsKey(submissionsKey);
    setShowParticipants(entryCount > 0);
  }, [entryCount, prevEntryCount, submissionsKey]);

  const { usernames } = useGetUsernames(ownerAddresses ?? []);

  return (
    <Card
      variant="outline"
      className={`sm:w-1/2 transition-all duration-300 ease-in-out ${
        showParticipants ? "h-[210px] 3xl:h-[270px]" : "h-[60px] 3xl:h-[80px]"
      }`}
    >
      <div className="flex flex-col justify-between">
        <div className="flex flex-row items-center justify-between h-6 sm:h-8 3xl:h-10">
          <span className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
            Scores
          </span>
          {showParticipants && entryCount > 10 && (
            <Pagination
              totalPages={Math.ceil(entryCount / 10)}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          )}
          <div className="flex flex-row items-center gap-2">
            {entryCount > 0 && (
              <>
                <span className="hidden sm:block text-neutral 3xl:text-lg">
                  {showParticipants ? "Hide" : "Show Participants"}
                </span>
                <Switch
                  checked={showParticipants}
                  onCheckedChange={setShowParticipants}
                  className="hidden sm:block"
                />
              </>
            )}
            <div className="flex flex-row items-center font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
              <span className="w-8 2xl:w-10 3xl:w-12">
                <USER />
              </span>
              : {entryCount}
            </div>
          </div>
        </div>
        <div
          className={`transition-all duration-300 delay-50 ease-in-out ${
            showParticipants ? "h-auto opacity-100" : "h-0 opacity-0"
          }`}
        >
          <div className="w-full h-0.5 bg-brand/25 mt-2" />
          {!loading ? (
            <div className="flex flex-row py-2">
              {[0, 1].map((colIndex) => (
                <div
                  key={colIndex}
                  className={`flex flex-col w-1/2 relative ${
                    colIndex === 0 ? "pr-3" : "pl-3"
                  }`}
                >
                  {colIndex === 0 && leaderboard.length > 5 && (
                    <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-brand/25 h-full" />
                  )}
                  {leaderboard
                    ?.slice(colIndex * 5, colIndex * 5 + 5)
                    .map((registration, index) => (
                      <div key={index}>
                        {/* Desktop hover card (hidden on mobile) */}
                        <div className="hidden sm:block">
                          <HoverCard openDelay={50} closeDelay={0}>
                            <HoverCardTrigger asChild>
                              <div
                                className={`flex flex-row items-center sm:gap-1 xl:gap-2 px-2 hover:cursor-pointer hover:bg-brand/25 hover:border-brand/30 border border-transparent rounded transition-all duration-200 3xl:text-lg relative ${
                                  registration.has_submitted ? "pr-4" : ""
                                }`}
                              >
                                <span className="w-4 flex-none font-brand">
                                  {index +
                                    1 +
                                    colIndex * 5 +
                                    (currentPage - 1) * 10}
                                  .
                                </span>
                                <span className="w-6 3xl:w-8 flex-none">
                                  <USER />
                                </span>
                                <span className="flex-none lg:max-w-20 xl:max-w-24 2xl:max-w-28 3xl:max-w-44 group-hover:text-brand transition-colors duration-200 text-ellipsis overflow-hidden whitespace-nowrap">
                                  {feltToString(registration?.player_name)}
                                </span>
                                <p
                                  className="flex-1 h-[2px] bg-repeat-x"
                                  style={{
                                    backgroundImage:
                                      "radial-gradient(circle, currentColor 1px, transparent 1px)",
                                    backgroundSize: "8px 8px",
                                    backgroundPosition: "0 center",
                                  }}
                                ></p>
                                <div className="flex flex-row items-center gap-2">
                                  <span className="flex-none text-brand font-brand">
                                    {registration.score ?? 0}
                                  </span>
                                </div>
                                {!!registration.has_submitted && (
                                  <span className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-5 h-5">
                                    <VERIFIED />
                                  </span>
                                )}
                              </div>
                            </HoverCardTrigger>
                            <HoverCardContent
                              className="py-4 px-0 text-sm z-50"
                              align="center"
                              side="top"
                            >
                              <PlayerDetails
                                playerName={registration?.player_name}
                                ownerAddress={
                                  ownerAddresses?.[index + colIndex * 5]
                                }
                                usernames={usernames}
                                metadata={registration?.metadata}
                                isEnded={isEnded}
                                hasSubmitted={registration.has_submitted}
                              />
                            </HoverCardContent>
                          </HoverCard>
                        </div>

                        {/* Mobile clickable row (hidden on desktop) */}
                        <div
                          className="sm:hidden flex flex-row items-center sm:gap-2 hover:cursor-pointer hover:bg-brand/25 hover:border-brand/30 border border-transparent rounded transition-all duration-200"
                          onClick={() => {
                            setSelectedPlayer({
                              registration,
                              index: index + colIndex * 5,
                            });
                            setIsMobileDialogOpen(true);
                          }}
                        >
                          <span className="w-4 flex-none font-brand">
                            {index + 1 + colIndex * 5 + (currentPage - 1) * 10}.
                          </span>
                          <span className="w-6 flex-none">
                            <USER />
                          </span>
                          <span className="flex-none max-w-16 group-hover:text-brand transition-colors duration-200 text-ellipsis overflow-hidden whitespace-nowrap">
                            {feltToString(registration?.player_name)}
                          </span>
                          <p
                            className="flex-1 h-[2px] bg-repeat-x"
                            style={{
                              backgroundImage:
                                "radial-gradient(circle, currentColor 1px, transparent 1px)",
                              backgroundSize: "8px 8px",
                              backgroundPosition: "0 center",
                            }}
                          ></p>
                          <div className="flex flex-row items-center gap-2">
                            <span className="flex-none text-brand font-brand">
                              {registration.score ?? 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ) : (
            <TableSkeleton entryCount={entryCount} offset={offset} />
          )}
        </div>
      </div>

      {/* Mobile dialog for player details */}
      <MobilePlayerCard
        open={isMobileDialogOpen}
        onOpenChange={setIsMobileDialogOpen}
        selectedPlayer={selectedPlayer}
        usernames={usernames}
        ownerAddress={ownerAddresses?.[selectedPlayer?.index ?? 0]}
        isEnded={isEnded}
      />
    </Card>
  );
};

export default ScoreTable;
