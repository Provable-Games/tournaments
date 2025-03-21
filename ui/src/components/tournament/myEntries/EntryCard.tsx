import TokenGameIcon from "@/components/icons/TokenGameIcon";
import { HoverCardTrigger } from "@/components/ui/hover-card";
import { Card } from "@/components/ui/card";
import { HoverCard } from "@/components/ui/hover-card";
import { INFO } from "@/components/Icons";
import EntryInfo from "@/components/tournament/myEntries/EntryInfo";
import { feltToString, formatScore } from "@/lib/utils";
import { TokenMetadata } from "@/generated/models.gen";
import { BigNumberish } from "starknet";
import { Button } from "@/components/ui/button";
import { getGameName, getGameUrl } from "@/assets/games";
import { TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { Tooltip } from "@/components/ui/tooltip";

interface EntryCardProps {
  gameAddress: string;
  mergedEntry: {
    gameMetadata: TokenMetadata | null;
    tournament_id?: BigNumberish | undefined;
    game_token_id?: BigNumberish | undefined;
    entry_number?: BigNumberish | undefined;
    has_submitted?: boolean | undefined;
    fieldOrder?: string[] | undefined;
    score?: string | undefined;
    tokenMetadata?: string | null;
  };
}

const EntryCard = ({ gameAddress, mergedEntry }: EntryCardProps) => {
  const currentDate = BigInt(new Date().getTime()) / 1000n;
  const hasStarted =
    !!mergedEntry.gameMetadata?.lifecycle.start.Some &&
    BigInt(mergedEntry.gameMetadata?.lifecycle.start.Some) < currentDate;

  const hasEnded =
    !!mergedEntry.gameMetadata?.lifecycle.end.Some &&
    BigInt(mergedEntry.gameMetadata?.lifecycle.end.Some) < currentDate;

  const isActive = hasStarted && !hasEnded;

  const gameUrl = getGameUrl(gameAddress);

  const gameName = getGameName(gameAddress);

  if (!mergedEntry.entry_number) {
    return null;
  }

  return (
    <Card
      variant="outline"
      className="flex-none flex flex-col items-center gap-2 h-[120px] w-[80px] p-1 relative group"
    >
      <TokenGameIcon game={gameAddress} size={"sm"} />
      <div className="absolute top-1 left-1 text-xs">
        #{mergedEntry.entry_number?.toString()}
      </div>
      <HoverCard openDelay={50} closeDelay={0}>
        <HoverCardTrigger asChild>
          <div className="absolute top-0 right-0 text-brand-muted hover:cursor-pointer w-5 h-5 z-20">
            <INFO />
          </div>
        </HoverCardTrigger>
        <EntryInfo
          entryNumber={mergedEntry.entry_number?.toString() ?? ""}
          tokenMetadata={mergedEntry.tokenMetadata ?? ""}
        />
      </HoverCard>
      <Tooltip delayDuration={50}>
        <TooltipTrigger asChild>
          <p className="text-xs truncate text-brand-muted w-full text-center cursor-pointer">
            {feltToString(mergedEntry.gameMetadata?.player_name ?? "")}
          </p>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          align="center"
          className="max-w-[300px] break-words"
        >
          <p className="text-sm font-medium">
            {feltToString(mergedEntry.gameMetadata?.player_name ?? "")}
          </p>
        </TooltipContent>
      </Tooltip>
      {isActive && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button
            size="sm"
            onClick={() => {
              window.open(
                gameName === "Dark Shuffle"
                  ? `https://darkshuffle.io/play/${Number(
                      mergedEntry.game_token_id
                    )}`
                  : gameUrl,
                "_blank"
              );
            }}
          >
            PLAY
          </Button>
        </div>
      )}
      {hasStarted && (
        <div className="flex flex-row items-center justify-center gap-1 w-full px-0.5">
          <span className="text-[10px] text-neutral">Score:</span>
          <span>{formatScore(Number(mergedEntry.score))}</span>
        </div>
      )}
      <div className="flex flex-row items-center justify-center w-full px-2">
        {isActive ? (
          <>
            <p className="text-xs text-neutral">Active</p>
          </>
        ) : hasEnded ? (
          <p className="text-xs text-warning">Ended</p>
        ) : (
          <p className="text-xs text-warning">Not Started</p>
        )}
      </div>
    </Card>
  );
};

export default EntryCard;
