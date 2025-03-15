import { useState, useRef, useEffect, useMemo } from "react";
import { X, CHEVRON_DOWN } from "@/components/Icons";
import useUIStore from "@/hooks/useUIStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GameFilters from "@/components/overview/GameFilters";
import GameIcon from "@/components/icons/GameIcon";
import TournamentTabs from "@/components/overview/TournamentTabs";
import {
  useGetUpcomingTournamentsCount,
  useGetLiveTournamentsCount,
  useGetEndedTournamentsCount,
  useGetTournaments,
  useGetMyTournaments,
  useGetMyTournamentsCount,
} from "@/dojo/hooks/useSqlQueries";
import { bigintToHex, feltToString, indexAddress } from "@/lib/utils";
import { addAddressPadding } from "starknet";
import { processPrizesFromSql } from "@/lib/utils/formatting";
import { useDojo } from "@/context/dojo";
import { processTournamentFromSql } from "@/lib/utils/formatting";
import EmptyResults from "@/components/overview/tournaments/EmptyResults";
import { TournamentCard } from "@/components/overview/TournamanentCard";
import TournamentSkeletons from "@/components/overview/TournamentSkeletons";
import NoAccount from "@/components/overview/tournaments/NoAccount";
import { useAccount } from "@starknet-react/core";

const SORT_OPTIONS = {
  upcoming: [
    { value: "start_time", label: "Start Time" },
    { value: "players", label: "Players" },
  ],
  live: [
    { value: "end_time", label: "End Time" },
    { value: "players", label: "Players" },
  ],
  ended: [
    { value: "end_time", label: "End Time" },
    { value: "players", label: "Players" },
    { value: "winners", label: "Winners" },
  ],
  my: [
    { value: "start_time", label: "Start Time" },
    { value: "status", label: "Status" },
  ],
} as const;

const Overview = () => {
  const { nameSpace } = useDojo();
  const { address } = useAccount();
  const { selectedTab, setSelectedTab } = useUIStore();
  const [page, setPage] = useState(0);
  const { gameFilters, setGameFilters, gameData } = useUIStore();
  const [sortBy, setSortBy] = useState<string>(
    SORT_OPTIONS[selectedTab][0].value
  );

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const currentTime = useMemo(() => {
    return addAddressPadding(bigintToHex(BigInt(Date.now()) / 1000n));
  }, []);

  const { data: upcomingTournamentsCount } = useGetUpcomingTournamentsCount({
    namespace: nameSpace,
    currentTime: currentTime,
  });

  const { data: liveTournamentsCount } = useGetLiveTournamentsCount({
    namespace: nameSpace,
    currentTime: currentTime,
  });

  const { data: endedTournamentsCount } = useGetEndedTournamentsCount({
    namespace: nameSpace,
    currentTime: currentTime,
  });

  const queryAddress = useMemo(() => {
    if (!address || address === "0x0") return null;
    return indexAddress(address);
  }, [address]);

  const gameAddresses = useMemo(() => {
    return gameData?.map((game) => indexAddress(game.contract_address));
  }, [gameData]);

  const { data: myTournamentsCount } = useGetMyTournamentsCount({
    namespace: nameSpace,
    address: queryAddress ?? "",
    gameAddresses: gameAddresses ?? [],
  });

  const tournamentCounts = useMemo(() => {
    return {
      upcoming: upcomingTournamentsCount,
      live: liveTournamentsCount,
      ended: endedTournamentsCount,
      my: myTournamentsCount,
    };
  }, [
    upcomingTournamentsCount,
    liveTournamentsCount,
    endedTournamentsCount,
    myTournamentsCount,
  ]);

  useEffect(() => {
    setSortBy(SORT_OPTIONS[selectedTab][0].value);
  }, [selectedTab]);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [gameFilters]);

  const removeGameFilter = (filter: string) => {
    setGameFilters(gameFilters.filter((f) => f !== filter));
  };

  const hexTimestamp = useMemo(
    () => addAddressPadding(bigintToHex(BigInt(new Date().getTime()) / 1000n)),
    []
  );

  const { data: tournaments, loading: tournamentsLoading } = useGetTournaments({
    namespace: nameSpace,
    currentTime: hexTimestamp,
    gameFilters: gameFilters,
    offset: page * 12,
    limit: 12,
    status: selectedTab,
    sortBy: sortBy,
    active:
      selectedTab === "upcoming" ||
      selectedTab === "live" ||
      selectedTab === "ended",
  });

  const { data: myTournaments, loading: myTournamentsLoading } =
    useGetMyTournaments({
      namespace: nameSpace,
      address: queryAddress,
      gameAddresses: gameAddresses ?? [],
      gameFilters: gameFilters,
      limit: 12,
      offset: page * 12,
      active: selectedTab === "my",
    });

  const tournamentsData = (
    selectedTab === "my" ? myTournaments : tournaments
  ).map((tournament) => {
    const processedTournament = processTournamentFromSql(tournament);
    const processedPrizes = processPrizesFromSql(
      tournament.prizes,
      tournament.id
    );
    return {
      tournament: processedTournament,
      prizes: processedPrizes,
      entryCount: Number(tournament.entry_count),
    };
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !(tournamentsLoading || myTournamentsLoading) &&
          tournamentCounts[selectedTab] > 12
        ) {
          setPage((prevPage) => prevPage + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadingRef.current) {
      observer.observe(loadingRef.current);
    }

    return () => observer.disconnect();
  }, [tournamentsLoading, myTournamentsLoading, tournamentCounts]);

  useEffect(() => {
    if (myTournamentsCount > 0) {
      setSelectedTab("my");
    } else if (upcomingTournamentsCount > 0) {
      setSelectedTab("upcoming");
    } else if (liveTournamentsCount > 0) {
      setSelectedTab("live");
    } else if (endedTournamentsCount > 0) {
      setSelectedTab("ended");
    }
  }, [
    upcomingTournamentsCount,
    liveTournamentsCount,
    endedTournamentsCount,
    myTournamentsCount,
  ]);

  const LoadingSpinner = () => (
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
  );

  return (
    <div className="flex flex-row gap-5">
      <GameFilters />
      <div className="flex flex-col gap-2 sm:gap-0 w-full sm:w-4/5 p-1 sm:p-2">
        <div className="flex flex-row items-center justify-between w-full border-b-4 border-brand h-[44px]">
          {/* Hide TournamentTabs on mobile when selectedTab is "my" */}
          <div className={selectedTab === "my" ? "hidden sm:block" : "block"}>
            <TournamentTabs
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
              upcomingTournamentsCount={upcomingTournamentsCount}
              liveTournamentsCount={liveTournamentsCount}
              endedTournamentsCount={endedTournamentsCount}
              myTournamentsCount={myTournamentsCount}
            />
          </div>

          {/* Show a title when on "my" tab on mobile */}
          {selectedTab === "my" && (
            <div className="sm:hidden font-brand text-xl">My Tournaments</div>
          )}
          <div className="flex flex-row gap-4 items-center">
            <span className="hidden 2xl:block">Sort By:</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="bg-black border-2 border-brand-muted px-2 min-w-[100px] h-8">
                <div className="flex flex-row items-center justify-between capitalize text-sm 2xl:text-base w-full sm:gap-2">
                  {
                    SORT_OPTIONS[selectedTab].find(
                      (option) => option.value === sortBy
                    )?.label
                  }
                  <span className="w-6">
                    <CHEVRON_DOWN />
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black border-2 border-brand-muted">
                <DropdownMenuLabel className="text-brand">
                  Options
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-brand-muted" />
                {SORT_OPTIONS[selectedTab].map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    className="text-brand cursor-pointer"
                    onClick={() => setSortBy(option.value)}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-col overflow-hidden">
          <div
            className={`
            transition-[height] duration-300 ease-in-out
            ${gameFilters.length > 0 ? "h-[60px] 2xl:h-[72px] sm:py-2" : "h-0"}
          `}
          >
            {gameFilters.length > 0 && (
              <div className="flex flex-row items-center gap-2 sm:gap-4 px-2 sm:p-4 h-[60px] 2xl:h-[72px] overflow-x-auto w-full">
                {gameFilters.map((filter) => (
                  <div
                    key={filter}
                    className="flex flex-row items-center gap-2 sm:gap-4 bg-black border-2 border-brand-muted py-2 px-4 shrink-0"
                  >
                    <GameIcon game={filter} />
                    <span className="text-lg 2xl:text-2xl font-brand">
                      {feltToString(
                        gameData.find(
                          (game) => game.contract_address === filter
                        )?.name!
                      )}
                    </span>
                    <span
                      className="w-4 h-4 sm:w-6 sm:h-6 text-brand-muted cursor-pointer"
                      onClick={() => removeGameFilter(filter)}
                    >
                      <X />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div
            ref={scrollContainerRef}
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4 gap-2 sm:gap-4 transition-all duration-300 ease-in-out sm:py-2 overflow-y-auto"
          >
            {selectedTab === "my" && !address ? (
              <NoAccount />
            ) : tournamentsLoading || myTournamentsLoading ? (
              <TournamentSkeletons
                tournamentsCount={tournamentCounts[selectedTab]}
              />
            ) : tournamentsData.length > 0 ? (
              tournamentsData.map((tournament, index) => (
                <TournamentCard
                  key={index}
                  tournament={tournament.tournament}
                  index={index}
                  status={selectedTab}
                  prizes={tournament.prizes}
                  entryCount={tournament.entryCount}
                />
              ))
            ) : (
              <EmptyResults gameFilters={gameFilters} />
            )}
          </div>
          <div ref={loadingRef} className="w-full py-4 flex justify-center">
            {(tournamentsLoading || myTournamentsLoading) && <LoadingSpinner />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
