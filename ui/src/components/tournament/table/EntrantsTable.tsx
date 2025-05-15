import Pagination from "@/components/table/Pagination";
import { USER } from "@/components/Icons";
import { useState, useEffect, useMemo } from "react";
import { addAddressPadding, BigNumberish } from "starknet";
import { useGetTournamentEntrants } from "@/dojo/hooks/useSqlQueries";
import {
  bigintToHex,
  displayAddress,
  feltToString,
  indexAddress,
} from "@/lib/utils";
import { useDojo } from "@/context/dojo";
import { useGetUsernames } from "@/hooks/useController";
import TableSkeleton from "@/components/tournament/table/Skeleton";
import { HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { HoverCard } from "@/components/ui/hover-card";
import { DialogContent } from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/dialog";
import {
  TournamentCard,
  TournamentCardTitle,
  TournamentCardContent,
  TournamentCardHeader,
  TournamentCardMetric,
  TournamentCardSwitch,
} from "@/components/tournament/containers/TournamentCard";

interface EntrantsTableProps {
  tournamentId: BigNumberish;
  entryCount: number;
  gameAddress: BigNumberish;
  gameNamespace: string;
}

const EntrantsTable = ({
  tournamentId,
  entryCount,
  gameAddress,
  gameNamespace,
}: EntrantsTableProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showParticipants, setShowParticipants] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const { namespace } = useDojo();

  const offset = (currentPage - 1) * 10;

  // Reset state when tournamentId changes
  useEffect(() => {
    setCurrentPage(1);
    refetchEntrants();
  }, [tournamentId, entryCount]);

  const {
    data: entrants,
    refetch: refetchEntrants,
    loading,
  } = useGetTournamentEntrants({
    namespace: namespace,
    tournamentId: addAddressPadding(bigintToHex(tournamentId)),
    gameNamespace: gameNamespace,
    gameAddress: indexAddress(gameAddress?.toString() ?? "0x0"),
    limit: 10,
    offset: offset,
  });

  const ownerAddresses = useMemo(
    () => entrants?.map((registration) => registration?.account_address),
    [entrants]
  );

  const [prevEntryCount, setPrevEntryCount] = useState<number | null>(null);

  useEffect(() => {
    // Always update the previous entry count
    setPrevEntryCount(entryCount);

    // Always update showParticipants based on current entryCount
    setShowParticipants(entryCount > 0);

    // Only trigger refetch if we have a previous count and it changed
    if (prevEntryCount !== null && prevEntryCount !== entryCount) {
      const timer = setTimeout(() => {
        refetchEntrants();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [entryCount, prevEntryCount]);

  const { usernames } = useGetUsernames(ownerAddresses ?? []);

  // Function to render player details content
  const renderPlayerDetails = (registration: any, index: number) => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 px-4">
        <div className="flex flex-row gap-2">
          <span className="text-brand-muted">Player Name:</span>
          <span>{feltToString(registration?.player_name)}</span>
        </div>
        <div className="flex flex-row gap-2">
          <span className="text-brand-muted">Owner:</span>
          <span>
            {usernames?.get(ownerAddresses?.[index] ?? "") ||
              displayAddress(ownerAddresses?.[index] ?? "")}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <TournamentCard showCard={showParticipants}>
      <TournamentCardHeader>
        <TournamentCardTitle>Entrants</TournamentCardTitle>
        {showParticipants && entryCount > 10 && (
          <Pagination
            totalPages={Math.ceil(entryCount / 10)}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
          />
        )}
        <div className="flex flex-row items-center gap-2">
          <TournamentCardSwitch
            checked={showParticipants}
            onCheckedChange={setShowParticipants}
            showSwitch={entryCount > 0}
            notShowingSwitchLabel="No participants"
            checkedLabel="Hide"
            uncheckedLabel="Show Participants"
          />
          <TournamentCardMetric icon={<USER />} metric={entryCount} />
        </div>
      </TournamentCardHeader>
      <TournamentCardContent showContent={showParticipants}>
        {!loading ? (
          <div className="flex flex-row py-2">
            {[0, 1].map((colIndex) => (
              <div
                key={colIndex}
                className={`flex flex-col w-1/2 relative ${
                  colIndex === 0 ? "pr-3" : "pl-3"
                }`}
              >
                {colIndex === 0 && entrants.length > 5 && (
                  <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-brand/25 h-full" />
                )}
                {entrants
                  ?.slice(colIndex * 5, colIndex * 5 + 5)
                  .map((registration, index) => (
                    <div key={index}>
                      <div className="hidden sm:block">
                        <HoverCard openDelay={50} closeDelay={0}>
                          <HoverCardTrigger asChild>
                            <div className="flex flex-row items-center sm:gap-2 px-2 hover:cursor-pointer hover:bg-brand/25 hover:border-brand/30 border border-transparent rounded transition-all duration-200 3xl:text-lg">
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
                              <span className="flex-none max-w-20 group-hover:text-brand transition-colors duration-200">
                                {feltToString(registration?.player_name)}
                              </span>
                            </div>
                          </HoverCardTrigger>
                          <HoverCardContent
                            className="py-4 px-0 text-sm z-50"
                            align="center"
                            side="top"
                          >
                            {renderPlayerDetails(
                              registration,
                              index + colIndex * 5
                            )}
                          </HoverCardContent>
                        </HoverCard>
                      </div>

                      {/* Mobile clickable row (hidden on desktop) */}
                      <div
                        className="sm:hidden flex flex-row items-center sm:gap-2 hover:cursor-pointer hover:bg-brand/25 hover:border-brand/30 border border-transparent rounded transition-all duration-200"
                        onClick={() => {
                          setSelectedPlayer({ registration, index });
                          setIsMobileDialogOpen(true);
                        }}
                      >
                        <span className="w-4 flex-none font-brand">
                          {index + 1 + colIndex * 5 + (currentPage - 1) * 10}.
                        </span>
                        <span className="w-6 flex-none">
                          <USER />
                        </span>
                        <span className="flex-none max-w-20 3xl:max-w-44 group-hover:text-brand transition-colors duration-200">
                          {feltToString(registration?.player_name)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ) : (
          <TableSkeleton entryCount={entryCount} offset={offset} />
        )}
      </TournamentCardContent>

      {/* Mobile dialog for player details */}
      <Dialog open={isMobileDialogOpen} onOpenChange={setIsMobileDialogOpen}>
        <DialogContent className="sm:hidden bg-black border border-brand p-4 rounded-lg max-w-[90vw] mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-brand text-lg text-brand">Player Details</h3>
          </div>

          {selectedPlayer &&
            renderPlayerDetails(
              selectedPlayer.registration,
              selectedPlayer.index
            )}
        </DialogContent>
      </Dialog>
    </TournamentCard>
  );
};

export default EntrantsTable;
