import TokenGameIcon from "@/components/icons/TokenGameIcon";
import { HoverCardTrigger } from "@/components/ui/hover-card";
import { Card } from "@/components/ui/card";
import { HoverCard } from "@/components/ui/hover-card";
import { INFO } from "@/components/Icons";
import EntryInfo from "@/components/tournament/myEntries/EntryInfo";
import { feltToString } from "@/lib/utils";
import { TokenMetadata } from "@/generated/models.gen";
import { BigNumberish } from "starknet";
import { Button } from "@/components/ui/button";
import { getGameUrl } from "@/assets/games";

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
  const isActive =
    !!mergedEntry.gameMetadata?.lifecycle.start.Some &&
    BigInt(mergedEntry.gameMetadata?.lifecycle.start.Some) < currentDate;

  const gameUrl = getGameUrl(gameAddress);

  if (!mergedEntry.entry_number) {
    return null;
  }

  return (
    <Card
      variant="outline"
      className="flex-none flex flex-col items-center gap-2 h-[120px] w-[80px] p-1 pt-5 relative group"
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
      <p className="text-xs overflow-x-hidden text-ellipsis whitespace-nowrap text-brand-muted">
        {feltToString(mergedEntry.gameMetadata?.player_name ?? "")}
      </p>
      {isActive && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Button
            size="sm"
            onClick={() => {
              window.open(gameUrl, "_blank");
            }}
          >
            PLAY
          </Button>
        </div>
      )}
      <div className="absolute flex flex-row items-center justify-between bottom-1 w-full px-2">
        {isActive ? (
          <>
            <p className="text-[10px] text-neutral">Score:</p>
            <p className="text-xs text-brand">{mergedEntry.score}</p>
          </>
        ) : (
          <>
            <p className="text-xs text-neutral">Not Active</p>
          </>
        )}
      </div>
    </Card>
  );
};

export default EntryCard;
