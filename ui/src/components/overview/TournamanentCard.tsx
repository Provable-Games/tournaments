import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { feltToString, formatTime } from "@/lib/utils";
import TokenGameIcon from "@/components/icons/TokenGameIcon";
import { SOLID_CLOCK, USER } from "@/components/Icons";
import { useNavigate } from "react-router-dom";
import { Tournament, Token, Prize } from "@/generated/models.gen";
import { useDojo } from "@/context/dojo";
import {
  groupPrizesByTokens,
  calculateTotalValue,
  countTotalNFTs,
  extractEntryFeePrizes,
} from "@/lib/utils/formatting";
import { TabType } from "@/components/overview/TournamentTabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useUIStore from "@/hooks/useUIStore";
import { Badge } from "@/components/ui/badge";
import { ChainId } from "@/dojo/setup/networks";
import { TokenPrices } from "@/hooks/useEkuboPrices";
import { getTokenLogoUrl } from "@/lib/tokensMeta";

interface TournamentCardProps {
  tournament: Tournament;
  index: number;
  status: TabType;
  prizes: Prize[] | null;
  entryCount: number;
  tokens: Token[];
  tokenPrices: TokenPrices;
  pricesLoading: boolean;
  tokenDecimals: Record<string, number>;
}

export const TournamentCard = ({
  tournament,
  index,
  status,
  prizes,
  entryCount,
  tokens,
  tokenPrices,
  pricesLoading,
  tokenDecimals,
}: TournamentCardProps) => {
  const { selectedChainConfig } = useDojo();
  const navigate = useNavigate();
  const { gameData, getGameImage } = useUIStore();

  const entryFeeToken = tournament?.entry_fee.Some?.token_address;
  const entryFeeTokenSymbol = tokens.find(
    (t) => t.address === entryFeeToken
  )?.symbol;

  const { distributionPrizes } = extractEntryFeePrizes(
    tournament?.id,
    tournament?.entry_fee,
    entryCount
  );

  const allPrizes = [...distributionPrizes, ...(prizes ?? [])];

  const groupedPrizes = groupPrizesByTokens(allPrizes, tokens);

  const totalPrizesValueUSD = calculateTotalValue(
    groupedPrizes,
    tokenPrices,
    tokenDecimals
  );
  const totalPrizeNFTs = countTotalNFTs(groupedPrizes);

  // Get unique ERC20 tokens from prizes for display
  const uniqueErc20Tokens = useMemo(() => {
    const tokenMap = new Map<
      string,
      { address: string; symbol: string; logo?: string }
    >();

    Object.entries(groupedPrizes).forEach(([, prize]) => {
      if (prize.type === "erc20") {
        const token = tokens.find((t) => t.address === prize.address);
        if (token && !tokenMap.has(token.address)) {
          const logo = getTokenLogoUrl(
            selectedChainConfig.chainId ?? ChainId.SN_MAIN,
            token.address
          );
          tokenMap.set(token.address, {
            address: token.address,
            symbol: token.symbol,
            logo,
          });
        }
      }
    });

    return Array.from(tokenMap.values());
  }, [groupedPrizes, tokens, selectedChainConfig.chainId]);

  const startDate = new Date(Number(tournament.schedule.game.start) * 1000);
  const endDate = new Date(Number(tournament.schedule.game.end) * 1000);
  const duration =
    Number(tournament.schedule.game.end) -
    Number(tournament.schedule.game.start);
  const currentDate = new Date();
  const startsInSeconds = (startDate.getTime() - currentDate.getTime()) / 1000;
  const startsIn = formatTime(startsInSeconds);
  const endsInSeconds = (endDate.getTime() - currentDate.getTime()) / 1000;
  const endsIn = formatTime(endsInSeconds);
  const registrationType =
    tournament?.schedule.registration.isSome() && Number(startsInSeconds) <= 0
      ? "Closed"
      : Number(endsInSeconds) <= 0
      ? "Closed"
      : "Open";

  const gameAddress = tournament.game_config.address;
  const gameName = gameData.find(
    (game) => game.contract_address === gameAddress
  )?.name;
  const gameImage = getGameImage(gameAddress);

  const hasEntryFee = tournament?.entry_fee.isSome();

  const entryFee = tournament?.entry_fee.isSome()
    ? (() => {
        const entryFeeDecimals = tokenDecimals[entryFeeToken ?? ""] || 18;
        return (
          Number(
            BigInt(tournament?.entry_fee.Some?.amount!) /
              10n ** BigInt(entryFeeDecimals)
          ) * Number(tokenPrices[entryFeeTokenSymbol ?? ""] ?? 0)
        ).toFixed(2);
      })()
    : "Free";

  const renderDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return (
        <div className="flex flex-row items-center gap-0.5">
          <span>{days}</span>
          <span>D</span>
        </div>
      );
    } else if (hours > 0) {
      return (
        <div className="flex flex-row items-center gap-0.5">
          <span>{hours}</span>
          <span>H</span>
        </div>
      );
    } else if (minutes > 0) {
      return (
        <div className="flex flex-row items-center gap-0.5">
          <span>{minutes}</span>
          <span>min{minutes > 1 ? "s" : ""}</span>
        </div>
      );
    } else {
      return (
        <div className="flex flex-row items-center gap-0.5">
          <span>{seconds}</span>
          <span>sec{seconds > 1 ? "s" : ""}</span>
        </div>
      );
    }
  };

  const isRestricted = tournament?.entry_requirement.isSome();
  const hasEntryLimit =
    Number(tournament?.entry_requirement?.Some?.entry_limit) > 0;
  const entryLimit = tournament?.entry_requirement?.Some?.entry_limit;
  const requirementVariant =
    tournament?.entry_requirement.Some?.entry_requirement_type?.activeVariant();
  const tournamentRequirementVariant =
    tournament?.entry_requirement.Some?.entry_requirement_type?.variant?.tournament?.activeVariant();

  const renderTimeClass = (time: number) => {
    if (time > 3600) {
      return "text-success";
    } else {
      return "text-warning";
    }
  };

  return (
    <Card
      variant="outline"
      interactive={true}
      onClick={() => {
        navigate(`/tournament/${Number(tournament.id).toString()}`);
      }}
      className="h-32 sm:h-48 animate-in fade-in zoom-in duration-300 ease-out"
    >
      <div className="flex flex-col justify-between h-full">
        <div className="flex flex-col gap-2">
          <div className="flex flex-row justify-between text-lg 2xl:text-xl h-6">
            <p className="truncate w-2/3 font-brand">
              {feltToString(tournament?.metadata?.name!)}
            </p>
            <div className="flex flex-row gap-2 w-1/3 justify-end">
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <div className="flex flex-row items-center">
                    <span className="w-6">
                      <SOLID_CLOCK />
                    </span>
                    <span className="text-sm tracking-tight">
                      {renderDuration(duration)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  <p>Duration</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <div className="flex flex-row items-center">
                    <span className="w-7">
                      <USER />
                    </span>
                    <span>{entryCount}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  <p>Entries</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div className="hidden sm:block w-full h-0.5 bg-brand/25" />
        </div>
        <div className="flex flex-row items-center">
          <div className="flex flex-row sm:flex-wrap items-center gap-2 w-3/4">
            {/* Registration Type */}
            <Tooltip delayDuration={50}>
              <TooltipTrigger asChild>
                <div>
                  <Badge variant="outline" className="text-xs p-1 rounded-md">
                    {registrationType}
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>{registrationType} For Registration</p>
              </TooltipContent>
            </Tooltip>

            {/* Prize Spots */}
            <Tooltip delayDuration={50}>
              <TooltipTrigger asChild>
                <div>
                  <Badge variant="outline" className="text-xs p-1 rounded-md">
                    {Number(tournament.game_config.prize_spots)} Winners
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="center">
                <p>{Number(tournament.game_config.prize_spots)} Winners</p>
              </TooltipContent>
            </Tooltip>

            {/* Restricte Access */}
            {isRestricted && (
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <div>
                    <Badge variant="outline" className="text-xs p-1 rounded-md">
                      Restricted
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  <span>
                    {requirementVariant === "allowlist" ? (
                      "Allowlist"
                    ) : requirementVariant === "token" ? (
                      "Token"
                    ) : requirementVariant === "tournament" ? (
                      <span>
                        Tournament{" "}
                        <span className="capitalize">
                          {tournamentRequirementVariant}
                        </span>
                      </span>
                    ) : (
                      "Unknown"
                    )}
                  </span>
                </TooltipContent>
              </Tooltip>
            )}

            {/* Limited Entry */}
            {hasEntryLimit && (
              <Tooltip delayDuration={50}>
                <TooltipTrigger asChild>
                  <div>
                    <Badge variant="outline" className="text-xs p-1 rounded-md">
                      {Number(entryLimit) === 1
                        ? `${Number(entryLimit)} entry`
                        : `${Number(entryLimit)} entries`}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" align="center">
                  <p>
                    {Number(entryLimit) === 1
                      ? `${Number(entryLimit)} entry`
                      : `${Number(entryLimit)} entries`}{" "}
                    per qualification
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex flex-row w-1/4 justify-end sm:px-2">
            <Tooltip delayDuration={50}>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <TokenGameIcon key={index} image={gameImage} size={"md"} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" align="center" sideOffset={-10}>
                {gameName ? gameName : "Unknown"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="flex flex-row items-center justify-center gap-5 w-full mx-auto">
          {/* Time Status */}
          {status === "upcoming" ? (
            <div className="flex flex-row items-center gap-2">
              <span className="text-brand-muted">Starts In:</span>
              <span className={renderTimeClass(startsInSeconds)}>
                {startsIn}
              </span>
            </div>
          ) : status === "live" ? (
            <div className="flex flex-row items-center gap-2">
              <span className="text-brand-muted">Ends In:</span>
              <span className={renderTimeClass(endsInSeconds)}>{endsIn}</span>
            </div>
          ) : (
            <></>
          )}
          <div className="flex flex-row items-center gap-2">
            <span className="text-brand-muted">Fee:</span>
            {pricesLoading ? (
              <Skeleton className="h-6 w-16 bg-brand/20" />
            ) : hasEntryFee ? (
              <div className="flex flex-col items-center gap-1">
                {entryFeeTokenSymbol && (
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger asChild>
                      <div className="relative hidden sm:block">
                        {(() => {
                          const entryFeeTokenLogo = getTokenLogoUrl(
                            selectedChainConfig.chainId ?? ChainId.SN_MAIN,
                            entryFeeToken ?? ""
                          );
                          return entryFeeTokenLogo ? (
                            <img
                              src={entryFeeTokenLogo}
                              alt={entryFeeTokenSymbol}
                              className="w-5 h-5 rounded-full"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center text-xs">
                              {entryFeeTokenSymbol.slice(0, 1)}
                            </div>
                          );
                        })()}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <p>{entryFeeTokenSymbol}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <span>${entryFee}</span>
              </div>
            ) : (
              <span>FREE</span>
            )}
          </div>
          <div className="flex flex-row items-center gap-2">
            <span className="text-brand-muted">Pot:</span>
            {pricesLoading ? (
              <Skeleton className="h-6 w-16 bg-brand/20" />
            ) : totalPrizesValueUSD > 0 || totalPrizeNFTs > 0 ? (
              <div className="flex flex-col items-center gap-1">
                {uniqueErc20Tokens.length > 0 && (
                  <div className="hidden sm:flex flex-row gap-1 items-center">
                    {uniqueErc20Tokens.slice(0, 3).map((token, idx) => (
                      <Tooltip key={idx} delayDuration={50}>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            {token.logo ? (
                              <img
                                src={token.logo}
                                alt={token.symbol}
                                className="w-5 h-5 rounded-full"
                              />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-brand/20 flex items-center justify-center text-xs">
                                {token.symbol.slice(0, 1)}
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center">
                          <p>{token.symbol}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {uniqueErc20Tokens.length > 3 && (
                      <span className="text-xs text-brand-muted">
                        +{uniqueErc20Tokens.length - 3}
                      </span>
                    )}
                  </div>
                )}
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
