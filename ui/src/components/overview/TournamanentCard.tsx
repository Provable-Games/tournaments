import { Card } from "@/components/ui/card";
import { feltToString, formatTime } from "@/lib/utils";
import TokenGameIcon from "@/components/icons/TokenGameIcon";
import { USER } from "@/components/Icons";
import { useNavigate } from "react-router-dom";
import { Tournament, Token, Prize } from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { useDojo } from "@/context/dojo";
import {
  groupPrizesByTokens,
  getErc20TokenSymbols,
  calculateTotalValue,
  countTotalNFTs,
  extractEntryFeePrizes,
} from "@/lib/utils/formatting";
import { useEkuboPrices } from "@/hooks/useEkuboPrices";
import { TabType } from "@/components/overview/TournamentTabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useUIStore from "@/hooks/useUIStore";
import { useState, useEffect } from "react";

interface TournamentCardProps {
  tournament: Tournament;
  index: number;
  status: TabType;
  prizes: Prize[] | null;
  entryCount: number;
}

export const TournamentCard = ({
  tournament,
  index,
  status,
  prizes,
  entryCount,
}: TournamentCardProps) => {
  const { nameSpace } = useDojo();
  const navigate = useNavigate();
  const state = useDojoStore((state) => state);
  const { gameData } = useUIStore();
  const [allPricesFound, setAllPricesFound] = useState(false);

  // token entities
  const tokenModels = state.getEntitiesByModel(nameSpace, "Token");
  const tokens = tokenModels.map(
    (model) => model.models[nameSpace].Token
  ) as Token[];

  const entryFeeToken = tournament?.entry_fee.Some?.token_address;
  const entryFeeTokenSymbol = tokens.find(
    (t) => t.address === entryFeeToken
  )?.symbol;

  const entryFeePrizes = extractEntryFeePrizes(
    tournament?.id,
    tournament?.entry_fee,
    entryCount
  );

  const allPrizes = [...entryFeePrizes, ...(prizes ?? [])];

  const groupedPrizes = groupPrizesByTokens(allPrizes, tokens);

  const erc20TokenSymbols = getErc20TokenSymbols(groupedPrizes);
  const { prices, isLoading: pricesLoading } = useEkuboPrices({
    tokens: [
      ...erc20TokenSymbols,
      ...(entryFeeTokenSymbol ? [entryFeeTokenSymbol] : []),
    ],
  });

  const totalPrizesValueUSD = calculateTotalValue(
    groupedPrizes,
    prices,
    allPricesFound
  );

  useEffect(() => {
    const allPricesExist = Object.keys(prizes ?? []).every(
      (symbol) => prices[symbol] !== undefined
    );

    setAllPricesFound(allPricesExist);
  }, [prices, prizes]);

  const totalPrizeNFTs = countTotalNFTs(groupedPrizes);

  const registrationType = tournament?.schedule.registration.isNone()
    ? "Open"
    : "Fixed";

  const startDate = new Date(Number(tournament.schedule.game.start) * 1000);
  const endDate = new Date(Number(tournament.schedule.game.end) * 1000);
  const currentDate = new Date();
  const startsIn = formatTime(
    (startDate.getTime() - currentDate.getTime()) / 1000
  );
  const endsInSeconds = (endDate.getTime() - currentDate.getTime()) / 1000;
  const endsIn = endsInSeconds > 0 ? formatTime(endsInSeconds) : "Ended ";

  const gameAddress = tournament.game_config.address;
  const gameName = gameData.find(
    (game) => game.contract_address === gameAddress
  )?.name;

  const hasEntryFee = tournament?.entry_fee.isSome();

  const entryFee = tournament?.entry_fee.isSome()
    ? (
        Number(BigInt(tournament?.entry_fee.Some?.amount!) / 10n ** 18n) *
        Number(prices[entryFeeTokenSymbol ?? ""])
      ).toFixed(2)
    : "Free";

  return (
    <Card
      variant="outline"
      interactive={true}
      onClick={() => {
        navigate(`/tournament/${Number(tournament.id).toString()}`);
      }}
      className="h-24 sm:h-48 animate-in fade-in zoom-in duration-300 ease-out"
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row justify-between font-brand text-lg 2xl:text-xl">
            <p className="truncate">
              {feltToString(tournament?.metadata?.name!)}
            </p>
            <div className="flex flex-row items-center">
              <span className="w-6">
                <USER />
              </span>
              : {entryCount}
            </div>
          </div>
          <div className="hidden sm:block w-full h-0.5 bg-brand/25" />
        </div>
        <div className="hidden sm:flex flex-row">
          <div className="flex flex-col w-1/2">
            <div className="flex flex-row gap-2">
              <span className="text-brand-muted">Registration:</span>
              <span>{registrationType}</span>
            </div>
            <div className="flex flex-row gap-2">
              {status === "upcoming" ? (
                <>
                  <span className="text-brand-muted">Starts In:</span>
                  <span>{startsIn}</span>
                </>
              ) : (
                <>
                  <span className="text-brand-muted">Ends In:</span>
                  <span>{endsIn}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex flex-row -space-x-2 w-1/2 justify-end px-2">
            <Tooltip delayDuration={50}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center cursor-pointer">
                  <TokenGameIcon key={index} game={gameAddress} size={"md"} />
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                align="center"
                sideOffset={5}
                className="bg-black text-neutral border border-brand-muted px-2 py-1 rounded text-sm z-50"
              >
                {gameName ? feltToString(gameName) : "Unknown"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-row items-center justify-between w-3/4 mx-auto">
          <div className="flex sm:hidden flex-row">
            <TokenGameIcon key={index} game={gameAddress} size={"md"} />
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-brand-muted">Fee:</span>
            {pricesLoading ? (
              <Skeleton className="h-6 w-16 bg-brand/20" />
            ) : (
              <span>{hasEntryFee ? `$${entryFee}` : "FREE"}</span>
            )}
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-brand-muted">Pot:</span>
            {pricesLoading ? (
              <Skeleton className="h-6 w-16 bg-brand/20" />
            ) : totalPrizesValueUSD > 0 || totalPrizeNFTs > 0 ? (
              <div className="flex flex-row items-center gap-2">
                {totalPrizesValueUSD > 0 && (
                  <span>${totalPrizesValueUSD.toFixed(2)}</span>
                )}
                {totalPrizeNFTs > 0 && (
                  <span>
                    {totalPrizeNFTs} NFT{totalPrizeNFTs === 1 ? "" : "s"}
                  </span>
                )}
              </div>
            ) : (
              <span>No Prizes</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
