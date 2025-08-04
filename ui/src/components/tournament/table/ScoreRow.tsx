import { useMemo } from "react";
import { USER, VERIFIED } from "@/components/Icons";
import { HoverCardContent } from "@/components/ui/hover-card";
import { HoverCard } from "@/components/ui/hover-card";
import { HoverCardTrigger } from "@/components/ui/hover-card";
import useModel from "@/dojo/hooks/useModel";
import { getEntityIdFromKeys } from "@dojoengine/utils";
import { useDojo } from "@/context/dojo";
import { Registration, getModelsMapping } from "@/generated/models.gen";
import { PlayerDetails } from "@/components/tournament/table/PlayerCard";
import { GameTokenData } from "metagame-sdk";
import { displayAddress } from "@/lib/utils";
import { BigNumberish } from "starknet";

interface ScoreRowProps {
  index: number;
  gameAddress: BigNumberish;
  tokenId: number;
  colIndex: number;
  currentPage: number;
  game: GameTokenData; // Assuming game is an object with relevant properties
  usernames: Map<string, string> | undefined;
  isEnded: boolean;
  setSelectedPlayer: (player: any) => void;
  setIsMobileDialogOpen: (open: boolean) => void;
}

const ScoreRow = ({
  index,
  tokenId,
  gameAddress,
  colIndex,
  currentPage,
  game,
  usernames,
  isEnded,
  setSelectedPlayer,
  setIsMobileDialogOpen,
}: ScoreRowProps) => {
  const { namespace } = useDojo();
  const registrationEntityId = useMemo(
    () => getEntityIdFromKeys([BigInt(gameAddress), BigInt(tokenId!)]),
    [gameAddress, tokenId]
  );

  const registrationModel = useModel(
    registrationEntityId,
    getModelsMapping(namespace).Registration
  ) as unknown as Registration;

  const playerName = game.player_name;
  const score = game.score;
  const ownerAddress = game.owner;

  const username =
    usernames?.get(ownerAddress ?? "0x0") ||
    displayAddress(ownerAddress ?? "0x0");

  return (
    <div key={index}>
      {/* Desktop hover card (hidden on mobile) */}
      <div className="hidden sm:block">
        <HoverCard openDelay={50} closeDelay={0}>
          <HoverCardTrigger asChild>
            <div
              className={`flex flex-row items-center sm:gap-1 xl:gap-2 px-2 hover:cursor-pointer hover:bg-brand/25 hover:border-brand/30 border border-transparent rounded transition-all duration-200 3xl:text-lg relative ${
                registrationModel?.has_submitted ? "pr-4" : ""
              }`}
            >
              <span className="w-4 flex-none font-brand">
                {index + 1 + colIndex * 5 + currentPage * 10}.
              </span>
              <span className="w-6 3xl:w-8 flex-none">
                <USER />
              </span>
              <span className="flex-none lg:max-w-20 xl:max-w-24 2xl:max-w-28 3xl:max-w-44 group-hover:text-brand transition-colors duration-200 text-ellipsis overflow-hidden whitespace-nowrap">
                {playerName}
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
                <span className="flex-none text-brand font-brand">{score}</span>
              </div>
              {!!registrationModel?.has_submitted && (
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
              playerName={game.player_name ?? "Unknown Player"}
              username={username}
              metadata={game.metadata}
              isEnded={isEnded}
              hasSubmitted={registrationModel?.has_submitted}
            />
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* Mobile clickable row (hidden on desktop) */}
      <div
        className="sm:hidden flex flex-row items-center sm:gap-2 hover:cursor-pointer hover:bg-brand/25 hover:border-brand/30 border border-transparent rounded transition-all duration-200"
        onClick={() => {
          setSelectedPlayer({
            game,
            index: index + colIndex * 5,
          });
          setIsMobileDialogOpen(true);
        }}
      >
        <span className="w-4 flex-none font-brand">
          {index + 1 + colIndex * 5 + currentPage * 10}.
        </span>
        <span className="w-6 flex-none">
          <USER />
        </span>
        <span className="flex-none max-w-16 group-hover:text-brand transition-colors duration-200 text-ellipsis overflow-hidden whitespace-nowrap">
          {playerName}
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
          <span className="flex-none text-brand font-brand">{score}</span>
        </div>
      </div>
    </div>
  );
};

export default ScoreRow;
