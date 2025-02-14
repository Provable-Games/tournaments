import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ARROW_LEFT, TROPHY } from "@/components/Icons";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import EntrantsTable from "@/components/tournament/EntrantsTable";
import TournamentTimeline from "@/components/TournamentTimeline";
import { bigintToHex, feltToString, formatTime } from "@/lib/utils";
import { addAddressPadding } from "starknet";
import { useGetTournamentDetailsQuery } from "@/dojo/hooks/useSdkQueries";
import { getEntityIdFromKeys } from "@dojoengine/utils";
import {
  Tournament as TournamentModel,
  Prize,
  Token,
  EntryCount,
  ModelsMapping,
} from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { useDojo } from "@/context/dojo";
import PrizeDisplay from "@/components/tournament/Prize";
import { groupPrizesByPositions } from "@/lib/utils/formatting";
import useModel from "@/dojo/hooks/useModel";

const Tournament = () => {
  const { id } = useParams<{ id: string }>();
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { nameSpace } = useDojo();
  const state = useDojoStore.getState();
  // const tournament = tournaments[Number(id)];

  const { entities: tournamentDetails } = useGetTournamentDetailsQuery(
    addAddressPadding(bigintToHex(id!))
  );

  const tournamentEntityId = useMemo(
    () => getEntityIdFromKeys([BigInt(id!)]),
    [id]
  );

  const prizes: Prize[] = (tournamentDetails
    ?.filter((detail) => detail.Prize)
    .map((detail) => detail.Prize) ?? []) as unknown as Prize[];

  const tournamentModel = state.getEntity(tournamentEntityId)?.models[nameSpace]
    .Tournament as TournamentModel;
  const tokenModels = state.getEntitiesByModel(nameSpace, "Token");
  const tokens = tokenModels.map(
    (model) => model.models[nameSpace].Token
  ) as Token[];

  // entry count model
  const entryCountModel = useModel(
    tournamentEntityId,
    ModelsMapping.EntryCount
  ) as unknown as EntryCount;

  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const isTextOverflowing =
          textRef.current.scrollWidth > textRef.current.clientWidth;
        setIsOverflowing(isTextOverflowing);
      }
    };

    checkOverflow();
    // Add resize listener to recheck on window resize
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [tournamentModel?.metadata.description]); // Recheck when description changes

  if (!tournamentModel) {
    return (
      <div className="w-3/4 h-full m-auto flex items-center justify-center">
        <span className="font-astronaut text-2xl">Loading tournament...</span>
      </div>
    );
  }

  const durationSeconds = Number(
    BigInt(tournamentModel?.schedule.game.end) -
      BigInt(tournamentModel?.schedule.game.start)
  );

  const registrationType = tournamentModel?.schedule.registration.isNone()
    ? "Fixed"
    : "Open";

  const groupedPrizes = groupPrizesByPositions(prizes, tokens);

  const hasEntryFee = tournamentModel?.entry_fee.isSome();

  const entryFee = tournamentModel?.entry_fee.isSome()
    ? Number(BigInt(tournamentModel?.entry_fee.Some?.amount!) / 10n ** 18n)
    : "Free";

  console.log(entryFee);
  console.log(groupedPrizes);

  return (
    <div className="w-3/4 px-20 pt-20 mx-auto flex flex-col gap-5">
      <div className="flex flex-row justify-between">
        <Button variant="outline" onClick={() => navigate("/")}>
          <ARROW_LEFT />
          Back
        </Button>
        <div className="flex flex-row items-center gap-5">
          {/* <Button variant="outline">
            <PLUS /> Add Prizes
          </Button> */}
          <Button className="uppercase">
            <TROPHY />
            {` Enter | `}
            <span className="font-bold">{hasEntryFee ? "$5" : "Free"}</span>
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center h-12 justify-between">
          <div className="flex flex-row gap-5">
            <span className="font-astronaut text-4xl">
              {feltToString(tournamentModel.metadata.name)}
            </span>
            <div className="flex flex-row items-center gap-4 text-retro-green-dark">
              <span>
                Pot: <span className="text-retro-green">${100}</span>
              </span>
              {/* <span>
              Leaderboard: <span className="text-retro-green">Top 5</span>
            </span> */}
              <span>
                Duration:{" "}
                <span className="text-retro-green">
                  {formatTime(durationSeconds)}
                </span>
              </span>
              <span>
                Registration Type:{" "}
                <span className="text-retro-green">{registrationType}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-row">
            {/* <span>
              Starts:{" "}
              <span className="text-retro-green">
                {tournament.startsIn} Hours
              </span>
            </span> */}
          </div>
        </div>
        <div className={`flex ${isExpanded ? "flex-col" : "flex-row"}`}>
          <div
            className={`
          relative overflow-hidden transition-[height] duration-300
          ${isExpanded ? "h-auto w-full" : "h-6 w-3/4"}
        `}
          >
            <p
              ref={textRef}
              className={`${
                isExpanded
                  ? "whitespace-pre-wrap"
                  : "overflow-hidden text-ellipsis whitespace-nowrap"
              }`}
            >
              {tournamentModel?.metadata?.description}
            </p>
          </div>
          {isOverflowing && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="self-start text-retro-green hover:text-retro-green-dark font-bold"
            >
              {isExpanded ? "See Less" : "See More"}
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-10">
        <div className="flex flex-row items-center h-[150px] gap-5">
          <div className="w-1/2">
            <TournamentTimeline
              type={registrationType}
              startTime={Number(tournamentModel?.schedule.game.start)}
              duration={durationSeconds}
              submissionPeriod={Number(
                tournamentModel?.schedule.submission_duration
              )}
            />
          </div>
          <Card variant="outline" className="w-1/2 h-full">
            <div className="flex flex-col">
              <div className="flex flex-row justify-between font-astronaut text-2xl h-8">
                <span>Prizes</span>
                <div className="flex flex-row items-center">
                  <span className="w-8">
                    <TROPHY />
                  </span>
                  : {Number(tournamentModel.game_config.prize_spots)}
                </div>
              </div>
              <div className="w-full h-0.5 bg-retro-green/25" />
              <div className="p-4">
                {prizes.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {Object.entries(groupedPrizes)
                      .sort(
                        (a, b) =>
                          Number(a[1].payout_position) -
                          Number(b[1].payout_position)
                      )
                      .map(([position, prizes], index) => (
                        <PrizeDisplay
                          key={index}
                          position={Number(position)}
                          prizes={prizes}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32 text-retro-green/50 font-astronaut">
                    No prizes announced yet
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
        <div className="flex flex-row gap-5">
          <EntrantsTable
            entryCount={entryCountModel ? Number(entryCountModel.count) : 0}
          />
          <Card
            variant="outline"
            borderColor="rgba(0, 218, 163, 1)"
            className="w-1/2 flex flex-col justify-between"
          >
            <div className="flex flex-row justify-between font-astronaut text-2xl h-8">
              <span>My Entries</span>
              <div className="flex flex-row items-center">
                <span className="w-6">
                  <TROPHY />
                </span>
                : {5}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Tournament;
