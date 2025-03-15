import { Card } from "@/components/ui/card";
import { CairoCustomEnum } from "starknet";
import { Token, Tournament } from "@/generated/models.gen";
import { displayAddress, feltToString } from "@/lib/utils";
import { useDojo } from "@/context/dojo";
import { COIN, CHECK, TROPHY, CLOCK, LOCK, COUNTER } from "@/components/Icons";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Tournament as TournamentModel } from "@/generated/models.gen";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

const EntryRequirements = ({
  tournamentModel,
  tournamentsData,
  tokens,
}: {
  tournamentModel: TournamentModel;
  tournamentsData: Tournament[];
  tokens: Token[];
}) => {
  if (!tournamentModel?.entry_requirement?.isSome()) {
    return null;
  }
  const navigate = useNavigate();
  const { selectedChainConfig } = useDojo();

  const entryRequirement = useMemo(
    () => tournamentModel.entry_requirement.Some,
    [tournamentModel]
  );
  const activeVariant = useMemo(
    () => entryRequirement?.entry_requirement_type.activeVariant(),
    [entryRequirement]
  );

  const token = useMemo(
    () =>
      tokens.find(
        (token) =>
          token.address ===
          entryRequirement?.entry_requirement_type?.variant.token
      ),
    [tokens, entryRequirement]
  );

  const tournament = useMemo(
    () =>
      entryRequirement?.entry_requirement_type?.variant?.tournament as
        | CairoCustomEnum
        | undefined,
    [entryRequirement]
  );

  const tournamentVariant = useMemo(
    () => tournament?.activeVariant(),
    [tournament]
  );

  const allowlist = useMemo(
    () => entryRequirement?.entry_requirement_type?.variant?.allowlist,
    [entryRequirement]
  );

  const blockExplorerExists =
    selectedChainConfig.blockExplorerUrl !== undefined;

  const [dialogOpen, setDialogOpen] = useState(false);

  const renderContent = () => {
    if (activeVariant === "token") {
      return (
        <div className="text-brand flex flex-row items-center justify-center gap-1 w-full">
          <span className="w-8">
            <COIN />
          </span>
          <span className="hidden sm:block text-xs">{token?.name}</span>
        </div>
      );
    } else if (activeVariant === "tournament") {
      return (
        <div className="flex flex-row items-center gap-1">
          <span className="w-6">
            <TROPHY />
          </span>
          <span className="hidden sm:block capitalize">
            {tournamentVariant}
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex flex-row items-center justify-center gap-1 w-full">
          <span className="w-8">
            <CHECK />
          </span>
          <span className="hidden sm:block">Allowlist</span>
        </div>
      );
    }
  };

  const renderHoverContent = () => {
    if (activeVariant === "token") {
      return (
        <>
          <p className="text-muted-foreground">
            To enter this tournament you must hold:
          </p>
          <div className="flex items-center gap-2">
            <span className="w-8">
              <COIN />
            </span>
            <span>{token?.name}</span>
            <span
              className="text-brand-muted hover:cursor-pointer"
              onClick={() => {
                if (blockExplorerExists) {
                  window.open(
                    `${selectedChainConfig.blockExplorerUrl}nft-contract/${token?.address}`,
                    "_blank"
                  );
                }
              }}
            >
              {displayAddress(token?.address ?? "0x0")}
            </span>
          </div>
        </>
      );
    } else if (activeVariant === "tournament") {
      return (
        <>
          <h4 className="text-lg">
            Tournament <span className="capitalize">{tournamentVariant}</span>
          </h4>
          <div className="h-[100px] flex flex-col gap-2 overflow-y-auto">
            {tournamentsData?.map((tournament, index) => {
              const tournamentEnd = tournament.schedule.game.end;
              const tournamentEnded =
                BigInt(tournamentEnd) < BigInt(Date.now()) / 1000n;
              return (
                <div key={index} className="flex flex-row items-center gap-2">
                  <span>{feltToString(tournament.metadata.name)}</span>|
                  <div className="flex flex-row items-center gap-1">
                    <span className="w-4">
                      <CLOCK />
                    </span>
                    <span>{tournamentEnded ? "Ended" : "Active"}</span>
                  </div>
                  |
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      navigate(`/tournament/${Number(tournament.id)}`);
                    }}
                  >
                    View
                  </Button>
                </div>
              );
            })}
          </div>
        </>
      );
    } else {
      return (
        <div className="h-[100px] flex flex-col gap-2 overflow-y-auto">
          {allowlist?.map((item: string, index: number) => (
            <div key={index}>
              <span>{displayAddress(item)}</span>
            </div>
          ))}
        </div>
      );
    }
  };

  const TriggerCard = ({ onClick = () => {} }) => (
    <Card
      variant="outline"
      className="relative flex flex-row items-center justify-between sm:w-36 h-full p-1 px-2 hover:cursor-pointer"
      onClick={onClick}
    >
      <span className="hidden sm:block absolute left-0 -top-5 text-xs whitespace-nowrap uppercase text-brand-muted font-bold">
        Entry Requirements:
      </span>
      <span className="absolute -top-2 -right-1 flex items-center justify-center text-brand-subtle h-6 w-6 2xl:h-7 2xl:w-7 text-xs">
        <COUNTER />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex items-center justify-center text-brand w-4 h-4 2xl:w-5 2xl:h-5">
            <LOCK />
          </span>
        </span>
      </span>
      {renderContent()}
    </Card>
  );

  const ContentSection = () => (
    <div className="flex flex-col gap-2 h-full">{renderHoverContent()}</div>
  );

  return (
    <>
      {/* Mobile: Dialog (visible below sm breakpoint) */}
      <div className="sm:hidden">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <div>
              <TriggerCard />
            </div>
          </DialogTrigger>
          <DialogContent className="p-4">
            <h3 className="text-lg font-semibold mb-2">Entry Requirements</h3>
            <ContentSection />
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop: HoverCard (visible at sm breakpoint and above) */}
      <div className="hidden sm:block">
        <HoverCard openDelay={50} closeDelay={0}>
          <HoverCardTrigger asChild>
            <div>
              <TriggerCard />
            </div>
          </HoverCardTrigger>
          <HoverCardContent
            className="w-80 max-h-[150px] p-4 text-sm z-50 overflow-hidden"
            align="start"
            side="bottom"
            sideOffset={5}
          >
            <ContentSection />
          </HoverCardContent>
        </HoverCard>
      </div>
    </>
  );
};

export default EntryRequirements;
