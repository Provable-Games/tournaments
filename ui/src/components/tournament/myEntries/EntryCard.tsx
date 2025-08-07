import { useMemo } from "react";
import TokenGameIcon from "@/components/icons/TokenGameIcon";
import { HoverCardTrigger } from "@/components/ui/hover-card";
import { Card } from "@/components/ui/card";
import { HoverCard } from "@/components/ui/hover-card";
import { INFO } from "@/components/Icons";
import EntryInfo from "@/components/tournament/myEntries/EntryInfo";
import { formatScore } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getPlayUrl } from "@/assets/games";
import { TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { Tooltip } from "@/components/ui/tooltip";
import useUIStore from "@/hooks/useUIStore";
import { GameTokenData } from "metagame-sdk";
import {
  Tournament,
  Registration,
  getModelsMapping,
} from "@/generated/models.gen";
import useModel from "@/dojo/hooks/useModel";
import { useDojo } from "@/context/dojo";
import { getEntityIdFromKeys } from "@dojoengine/utils";

interface EntryCardProps {
  gameAddress: string;
  game: GameTokenData;
  tournamentModel: Tournament;
}

const EntryCard = ({ gameAddress, game, tournamentModel }: EntryCardProps) => {
  const { namespace } = useDojo();
  const { getGameImage, getGameName } = useUIStore();
  const currentDate = BigInt(new Date().getTime()) / 1000n;
  const hasStarted = (game?.lifecycle.start ?? 0) < currentDate;

  const hasEnded = (game?.lifecycle.end ?? 0) < currentDate;

  const isActive = hasStarted && !hasEnded;

  const playUrl = getPlayUrl(gameAddress);

  const gameName = getGameName(gameAddress);
  const gameImage = getGameImage(gameAddress);

  const registrationEntityId = useMemo(
    () => getEntityIdFromKeys([BigInt(gameAddress), BigInt(game.token_id!)]),
    [gameAddress, game.token_id]
  );

  const registrationModel = useModel(
    registrationEntityId,
    getModelsMapping(namespace).Registration
  ) as unknown as Registration;

  const entryNumber = registrationModel?.entry_number;

  if (!entryNumber) {
    return null;
  }

  return (
    <Card
      variant="outline"
      className="flex-none flex flex-col items-center justify-between h-full w-[100px] 3xl:w-[120px] p-1 relative group"
    >
      <div className="flex flex-col items-center justify-between w-full h-full pt-2">
        <Tooltip delayDuration={50}>
          <TooltipTrigger asChild>
            <span className="hover:cursor-pointer">
              <TokenGameIcon image={gameImage} size={"sm"} />
            </span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            className="max-w-[300px] break-words"
          >
            <p className="text-sm font-medium">{gameName}</p>
          </TooltipContent>
        </Tooltip>
        <div className="absolute top-1 left-1 text-xs 3xl:text-sm">
          #{Number(registrationModel.entry_number)}
        </div>
        <HoverCard openDelay={50} closeDelay={0}>
          <HoverCardTrigger asChild>
            <div className="absolute top-0 right-0 text-brand-muted hover:cursor-pointer w-5 h-5 z-20">
              <INFO />
            </div>
          </HoverCardTrigger>
          <EntryInfo
            entryNumber={entryNumber.toString()}
            tokenMetadata={game.metadata}
            tournamentModel={tournamentModel}
          />
        </HoverCard>
        <Tooltip delayDuration={50}>
          <TooltipTrigger asChild>
            <p className="text-xs truncate text-brand-muted w-full text-center cursor-pointer">
              {game.player_name}
            </p>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            className="max-w-[300px] break-words"
          >
            <p className="text-sm font-medium">{game.player_name ?? ""}</p>
          </TooltipContent>
        </Tooltip>
        {isActive && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button
              size="sm"
              onClick={() => {
                window.open(`${playUrl}${Number(game.token_id)}`, "_blank");
              }}
            >
              PLAY
            </Button>
          </div>
        )}
        {hasStarted && (
          <div className="flex flex-row items-center justify-center gap-1 w-full px-0.5">
            <span className="text-[10px] text-neutral">Score:</span>
            <span>{formatScore(Number(game.score))}</span>
          </div>
        )}
        <div className="flex flex-row items-center justify-center w-full px-2">
          {isActive ? (
            <>
              <p className="text-xs 3xl:text-sm text-success">Active</p>
            </>
          ) : hasEnded ? (
            <p className="text-xs 3xl:text-sm text-warning">Ended</p>
          ) : (
            <p className="text-xs 3xl:text-sm text-warning">Not Started</p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default EntryCard;
