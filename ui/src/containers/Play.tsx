import { Button } from "@/components/ui/button";
import { ARROW_LEFT } from "@/components/Icons";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { feltToString } from "@/lib/utils";
import { useDojo } from "@/context/dojo";
import { useGetTournaments } from "@/dojo/hooks/useSqlQueries";
import TournamentGames from "@/components/play/TournamentGames";
import { processPrizesFromSql } from "@/lib/utils/formatting";
import { processTournamentFromSql } from "@/lib/utils/formatting";
import { Tournament } from "@/generated/models.gen";

const Play = () => {
  const navigate = useNavigate();
  const { nameSpace } = useDojo();
  const [selectedTournament, setSelectedTournament] = useState<Tournament>();

  const { data: tournaments } = useGetTournaments({
    namespace: nameSpace,
    gameFilters: [],
    limit: 100,
    offset: 0,
    status: "all",
    active: true,
  });

  const tournamentsData = tournaments.map((tournament) => {
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

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-80px)] w-3/4 mx-auto px-20 pt-20">
      <div className="space-y-5">
        <div className="flex flex-row justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ARROW_LEFT />
            Home
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-5">
        <div className="flex flex-row items-center h-12 justify-between">
          <div className="flex flex-row gap-5">
            <span className="font-astronaut text-4xl">Game Simulator</span>
          </div>
        </div>
        <div className="flex flex-row gap-2">
          {tournamentsData?.map((tournament) => {
            return (
              <Button
                key={tournament.tournament.id}
                variant={
                  selectedTournament?.id === tournament.tournament.id
                    ? "default"
                    : "outline"
                }
                onClick={() => setSelectedTournament(tournament.tournament)}
              >
                <div className="flex flex-row items-center gap-2">
                  <p>{feltToString(tournament.tournament.metadata.name)}</p>-
                  <p>{Number(tournament.tournament.id).toString()}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
      {selectedTournament && (
        <TournamentGames tournament={selectedTournament} />
      )}
    </div>
  );
};

export default Play;
