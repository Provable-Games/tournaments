import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  GLOBE,
  TROPHY,
  X,
  USER,
  CHEVRON_DOWN,
  TOKEN,
} from "@/components/Icons";
import useUIStore from "@/hooks/useUIStore";
import Games from "@/assets/games";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import GameFilters from "@/components/overview/GameFilters";
import { useNavigate } from "react-router-dom";
import { tournaments } from "@/lib/constants";
import GameIcon from "@/components/icons/GameIcon";
import TokenGameIcon from "@/components/icons/TokenGameIcon";

const Overview = () => {
  const [selectedTab, setSelectedTab] = useState<"all" | "my">("all");
  const { gameFilters, setGameFilters } = useUIStore();
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<string>("start");

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Use useEffect to watch for filter changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [gameFilters]); // Reset scroll when filters change

  const removeGameFilter = (filter: keyof typeof Games) => {
    setGameFilters(gameFilters.filter((f) => f !== filter));
  };

  const filteredTournaments = tournaments.filter((tournament) => {
    if (gameFilters.length === 0) return true;
    return gameFilters.every((filter) => tournament.games.includes(filter));
  });

  return (
    <div className="flex flex-row p-20 gap-5 h-[calc(100vh-80px)]">
      <GameFilters />
      <div className="flex flex-col w-4/5 p-2">
        <div className="flex flex-row justify-between w-full border-b-4 border-retro-green">
          <div className="flex flex-row gap-2">
            <Button
              onClick={() => setSelectedTab("all")}
              variant={selectedTab === "all" ? "default" : "outline"}
              borderColor="rgba(0, 218, 163, 1)"
              className="[border-image-width:4px_4px_0_4px] rounded-b-none"
            >
              <GLOBE />
              All Tournaments
            </Button>
            <Button
              onClick={() => setSelectedTab("my")}
              variant={selectedTab === "my" ? "default" : "outline"}
              borderColor="rgba(0, 218, 163, 1)"
              className="[border-image-width:4px_4px_0_4px] rounded-b-none"
            >
              <TROPHY />
              My Tournaments
            </Button>
          </div>
          <div className="flex flex-row gap-4 items-center">
            Sort By:
            <DropdownMenu>
              <DropdownMenuTrigger className="bg-black border-2 border-retro-grey px-2 min-w-[100px]">
                <div className="flex flex-row items-center justify-between capitalize w-full gap-2">
                  {sortBy}
                  <span className="w-6">
                    <CHEVRON_DOWN />
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-black border-2 border-retro-grey">
                <DropdownMenuLabel className="text-retro-green">
                  Options
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-retro-green-dark" />
                <DropdownMenuItem
                  className="text-retro-green cursor-pointer"
                  onClick={() => setSortBy("start time")}
                >
                  Start Time
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-retro-green cursor-pointer"
                  onClick={() => setSortBy("end time")}
                >
                  End Time
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-retro-green cursor-pointer"
                  onClick={() => setSortBy("pot size")}
                >
                  Pot Size
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-retro-green cursor-pointer"
                  onClick={() => setSortBy("players")}
                >
                  Players
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="flex flex-col overflow-hidden">
          <div
            className={`
            transition-[height] duration-300 ease-in-out
            ${gameFilters.length > 0 ? "h-[72px] py-2" : "h-0"}
          `}
          >
            {gameFilters.length > 0 && (
              <div className="flex flex-row items-center gap-4 p-4 h-[72px] overflow-x-auto w-full">
                {gameFilters.map((filter) => (
                  <div className="flex flex-row items-center gap-4 bg-black border-2 border-retro-grey py-2 px-4 shrink-0">
                    <GameIcon game={filter} />
                    <span className="text-2xl font-astronaut">
                      {Games[filter].name}
                    </span>
                    <span
                      className="w-6 text-retro-green-dark cursor-pointer"
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
            className="grid grid-cols-3 gap-4 transition-all duration-300 ease-in-out py-4 overflow-y-auto"
          >
            {filteredTournaments.map((tournament, index) => (
              <Card
                key={index}
                variant="outline"
                interactive={true}
                borderColor="rgba(0, 218, 163, 1)"
                onClick={() => {
                  navigate(`/tournament/${index}`);
                }}
                className="animate-in fade-in zoom-in duration-300 ease-out"
              >
                <div className="flex flex-col justify-between h-full">
                  <div className="flex flex-row justify-between font-astronaut text-xl">
                    <p>{tournament.name}</p>
                    <div className="flex flex-row items-center">
                      <span className="w-6">
                        <USER />
                      </span>
                      : {tournament.players}
                    </div>
                  </div>
                  <div className="w-full h-0.5 bg-retro-green/25" />
                  <div className="flex flex-row">
                    <div className="flex flex-col w-1/2">
                      <div className="flex flex-row gap-2">
                        <span className="text-retro-green-dark">
                          Registration:
                        </span>
                        <span>{tournament.registration}</span>
                      </div>
                      <div className="flex flex-row gap-2">
                        <span className="text-retro-green-dark">
                          Starts In:
                        </span>
                        <span>{tournament.startsIn} Hours</span>
                      </div>
                    </div>
                    <div className="flex flex-row -space-x-2 w-1/2 justify-end px-2">
                      {tournament.games.slice(0, 3).map((game, index) => {
                        // If this is the 3rd item and there are more games
                        if (index === 2 && tournament.games.length > 3) {
                          return (
                            <span
                              key={index}
                              className="relative inline-flex items-center justify-center"
                            >
                              <span className={"text-retro-green/25 size-10"}>
                                <TOKEN />
                              </span>
                              <div className="absolute inset-0 flex items-center justify-center rounded-full text-retro-green font-astronaut">
                                +{tournament.games.length - 2}
                              </div>
                            </span>
                          );
                        }
                        // Regular token icon for first 2 items
                        return (
                          <TokenGameIcon key={index} game={game} size={"md"} />
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-row items-center justify-between w-3/4 mx-auto">
                    <div className="flex flex-row items-center gap-2">
                      <span className="text-retro-green-dark">Fee:</span>
                      <span>${tournament.fee}</span>
                    </div>
                    <div className="flex flex-row items-center gap-2">
                      <span className="text-retro-green-dark">Pot:</span>
                      <span>${tournament.pot}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Overview;
