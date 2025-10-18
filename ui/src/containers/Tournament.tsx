import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ARROW_LEFT,
  TROPHY,
  MONEY,
  GIFT,
  SPACE_INVADER_SOLID,
  SLIDERS,
} from "@/components/Icons";
import { useNavigate, useParams } from "react-router-dom";
import TournamentTimeline from "@/components/TournamentTimeline";
import { bigintToHex, feltToString, formatTime } from "@/lib/utils";
import { addAddressPadding, CairoCustomEnum } from "starknet";
import { useGetTournamentQuery } from "@/dojo/hooks/useSdkQueries";
import { getEntityIdFromKeys } from "@dojoengine/utils";
import { useSystemCalls } from "@/dojo/hooks/useSystemCalls";
import {
  Tournament as TournamentModel,
  Token,
  EntryCount,
  getModelsMapping,
  PrizeClaim,
  Leaderboard,
} from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { useDojo } from "@/context/dojo";
import {
  extractEntryFeePrizes,
  getClaimablePrizes,
  processTournamentFromSql,
} from "@/lib/utils/formatting";
import useModel from "@/dojo/hooks/useModel";
import { EnterTournamentDialog } from "@/components/dialogs/EnterTournament";
import ScoreTable from "@/components/tournament/table/ScoreTable";
import { useEkuboPrices } from "@/hooks/useEkuboPrices";
import MyEntries from "@/components/tournament/MyEntries";
import TokenGameIcon from "@/components/icons/TokenGameIcon";
import EntryRequirements from "@/components/tournament/EntryRequirements";
import PrizesContainer from "@/components/tournament/prizes/PrizesContainer";
import { ClaimPrizesDialog } from "@/components/dialogs/ClaimPrizes";
import { SubmitScoresDialog } from "@/components/dialogs/SubmitScores";
import {
  useGetTournamentPrizesAggregations,
  useGetTournaments,
  useGetTournamentsCount,
  useGetTokenByAddress,
  useGetTokens,
} from "@/dojo/hooks/useSqlQueries";
import NotFound from "@/containers/NotFound";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useUIStore from "@/hooks/useUIStore";
import { AddPrizesDialog } from "@/components/dialogs/AddPrizes";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingPage from "@/containers/LoadingPage";
import { Badge } from "@/components/ui/badge";
import { SettingsDialog } from "@/components/dialogs/Settings";
import { useSettings } from "metagame-sdk/sql";

const Tournament = () => {
  const { id } = useParams<{ id: string }>();
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { namespace } = useDojo();
  const { getTokenDecimals } = useSystemCalls();
  const state = useDojoStore((state) => state);
  const { gameData, getGameImage } = useUIStore();
  const [enterDialogOpen, setEnterDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [submitScoresDialogOpen, setSubmitScoresDialogOpen] = useState(false);
  const [addPrizesDialogOpen, setAddPrizesDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tournamentExists, setTournamentExists] = useState(false);
  const [tokenDecimals, setTokenDecimals] = useState<Record<string, number>>(
    {}
  );
  const [tokenDecimalsLoading, setTokenDecimalsLoading] = useState(false);
  const { data: tournamentsCount } = useGetTournamentsCount({
    namespace: namespace,
  });

  useEffect(() => {
    let timeoutId: number;

    const checkTournament = async () => {
      const tournamentId = Number(id || 0);

      // If we have the tournament count, we can check immediately
      if (tournamentsCount !== undefined) {
        setTournamentExists(tournamentId <= tournamentsCount);
        setLoading(false);
      } else {
        // Set a timeout to consider the tournament as "not found" if data doesn't load within 5 seconds
        timeoutId = window.setTimeout(() => {
          setTournamentExists(false);
          setLoading(false);
        }, 20000);
      }
    };

    checkTournament();

    // Clean up the timeout if the component unmounts or dependencies change
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [id, tournamentsCount]);

  useGetTournamentQuery(addAddressPadding(bigintToHex(id!)), namespace);

  const tournamentEntityId = useMemo(
    () => getEntityIdFromKeys([BigInt(id!)]),
    [id]
  );

  const tournamentModel = state.getEntity(addAddressPadding(tournamentEntityId))
    ?.models[namespace]?.Tournament as TournamentModel;

  const entryCountModel = useModel(
    tournamentEntityId,
    getModelsMapping(namespace).EntryCount
  ) as unknown as EntryCount;

  const leaderboardModel = useModel(
    tournamentEntityId,
    getModelsMapping(namespace).Leaderboard
  ) as unknown as Leaderboard;

  const leaderboardSize = Number(tournamentModel?.game_config.prize_spots);

  const totalSubmissions = leaderboardModel?.token_ids.length ?? 0;

  const allSubmitted =
    totalSubmissions ===
    Math.min(Number(entryCountModel?.count), leaderboardSize);

  const { tournamentCreatorShare, gameCreatorShare, distributionPrizes } =
    extractEntryFeePrizes(
      tournamentModel?.id,
      tournamentModel?.entry_fee,
      entryCountModel?.count ?? 0
    );

  const allPrizes = [...distributionPrizes];

  const tournamentClaimedPrizes = state.getEntitiesByModel(
    namespace,
    "PrizeClaim"
  );

  const claimedPrizes: PrizeClaim[] = (tournamentClaimedPrizes
    ?.filter(
      (detail) =>
        detail.models?.[namespace]?.PrizeClaim?.tournament_id === Number(id)
    )
    .map((detail) => detail.models[namespace].PrizeClaim) ??
    []) as unknown as PrizeClaim[];

  const { claimablePrizes, claimablePrizeTypes } = getClaimablePrizes(
    [...allPrizes, ...tournamentCreatorShare, ...gameCreatorShare],
    claimedPrizes
  );

  const allClaimed = claimablePrizes.length === 0;

  const gameAddress = tournamentModel?.game_config?.address;
  const gameName = gameData.find(
    (game) => game.contract_address === gameAddress
  )?.name;

  const [isOverflowing, setIsOverflowing] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!textRef.current) return;

    // Function to check overflow
    const checkOverflow = () => {
      if (textRef.current) {
        const isTextOverflowing =
          textRef.current.scrollWidth > textRef.current.clientWidth;
        setIsOverflowing(isTextOverflowing);
      }
    };

    // Initial check
    checkOverflow();

    // Use ResizeObserver for more efficient monitoring
    const resizeObserver = new ResizeObserver(checkOverflow);
    resizeObserver.observe(textRef.current);

    // Monitor content changes with MutationObserver
    const mutationObserver = new MutationObserver(checkOverflow);
    mutationObserver.observe(textRef.current, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [tournamentModel?.metadata.description]);

  const durationSeconds = Number(
    BigInt(tournamentModel?.schedule?.game?.end ?? 0n) -
      BigInt(tournamentModel?.schedule?.game?.start ?? 0n)
  );

  const registrationType = tournamentModel?.schedule.registration.isNone()
    ? "open"
    : "fixed";

  const hasEntryFee = tournamentModel?.entry_fee.isSome();

  const entryFeeToken = tournamentModel?.entry_fee.Some?.token_address;

  // Fetch entry fee token data using SQL query
  const { data: entryFeeTokenData } = useGetTokenByAddress({
    namespace,
    address: entryFeeToken || "",
    active: hasEntryFee && !!entryFeeToken,
  });

  const entryFeeTokenSymbol = (entryFeeTokenData as Token)?.symbol;

  console.log(entryFeeTokenSymbol, entryFeeTokenData);

  const tournamentId = tournamentModel?.id;

  // Fetch aggregated data
  const { data: aggregations, loading: aggregationsLoading } =
    useGetTournamentPrizesAggregations({
      namespace,
      tournamentId: tournamentId ?? 0,
      active: !!tournamentId,
    });

  // Extract unique token symbols from aggregated data and entry fee prizes
  const erc20TokenSymbols = useMemo(() => {
    const symbols = new Set<string>();

    // From aggregated data
    if (aggregations?.token_totals) {
      aggregations.token_totals.forEach((tokenTotal: any) => {
        if (tokenTotal.tokenSymbol && tokenTotal.tokenType === "erc20") {
          symbols.add(tokenTotal.tokenSymbol);
        }
      });
    }

    return Array.from(symbols);
  }, [aggregations?.token_totals]);

  // Extract unique token addresses for fetching token data
  const uniqueTokenAddresses = useMemo(() => {
    const addresses = new Set<string>();

    // From aggregated data
    if (aggregations?.token_totals) {
      aggregations.token_totals.forEach((tokenTotal: any) => {
        if (tokenTotal.tokenAddress) {
          addresses.add(tokenTotal.tokenAddress);
        }
      });
    }

    // Add entry fee token
    if (entryFeeToken) {
      addresses.add(entryFeeToken);
    }

    return Array.from(addresses);
  }, [aggregations?.token_totals, entryFeeToken]);

  // Fetch token data for all unique addresses in this tournament
  const { data: tokensData } = useGetTokens({
    namespace,
    active: uniqueTokenAddresses.length > 0,
    limit: 100, // Should be enough for tournament tokens
  });

  // Filter tokens to only include those used in this tournament
  const tournamentTokens = useMemo(() => {
    if (!tokensData) return [];
    return (tokensData as Token[]).filter((token) =>
      uniqueTokenAddresses.includes(token.address)
    );
  }, [tokensData, uniqueTokenAddresses]);

  // Add entry fee token symbol to the list
  const allTokenSymbols = useMemo(() => {
    const symbols = [...erc20TokenSymbols];
    if (entryFeeTokenSymbol && !symbols.includes(entryFeeTokenSymbol)) {
      symbols.push(entryFeeTokenSymbol);
    }
    return symbols;
  }, [erc20TokenSymbols, entryFeeTokenSymbol]);

  // Fetch prices for all ERC20 tokens
  const {
    prices: ownPrices,
    isLoading: ownPricesLoading,
    isTokenLoading,
  } = useEkuboPrices({
    tokens: allTokenSymbols,
  });

  // Use prop prices if provided, otherwise use own prices
  const prices = ownPrices;
  const pricesLoading = ownPricesLoading;

  // Calculate total value in USD using aggregated data
  const totalPrizesValueUSD = useMemo(() => {
    if (!aggregations?.token_totals || pricesLoading) return 0;

    // Calculate USD from aggregated database prizes
    const dbPrizesUSD = aggregations.token_totals.reduce(
      (total: number, tokenTotal: any) => {
        if (tokenTotal.tokenType === "erc20" && tokenTotal.totalAmount) {
          const decimals = tokenDecimals[tokenTotal.tokenAddress] || 18;
          const amount = BigInt(tokenTotal.totalAmount);
          const price = prices[tokenTotal.tokenSymbol || ""] || 0;

          return (
            total + Number(amount / 10n ** BigInt(decimals)) * Number(price)
          );
        }
        return total;
      },
      0
    );

    return dbPrizesUSD;
  }, [aggregations?.token_totals, prices, pricesLoading, tokenDecimals]);

  // Fetch token decimals only for tokens used in this tournament
  useEffect(() => {
    const fetchTokenDecimals = async () => {
      if (tokenDecimalsLoading || !aggregations?.token_totals) return;

      // Collect unique token addresses from tournament prizes
      const tournamentTokenAddresses = new Set<string>();

      // Add tokens from aggregated prize data
      aggregations.token_totals.forEach((tokenTotal: any) => {
        if (tokenTotal.tokenAddress && tokenTotal.tokenType === "erc20") {
          tournamentTokenAddresses.add(tokenTotal.tokenAddress);
        }
      });

      // Add entry fee token if exists
      if (entryFeeToken) {
        tournamentTokenAddresses.add(entryFeeToken);
      }

      // Add tokens from entry fee prizes
      [
        ...distributionPrizes,
        ...tournamentCreatorShare,
        ...gameCreatorShare,
      ].forEach((prize) => {
        if (prize.token_type?.variant?.erc20 && prize.token_address) {
          tournamentTokenAddresses.add(prize.token_address);
        }
      });

      // Filter to only include addresses we don't already have decimals for
      const missingAddresses = Array.from(tournamentTokenAddresses).filter(
        (addr) => !(addr in tokenDecimals)
      );

      if (missingAddresses.length === 0) return;

      setTokenDecimalsLoading(true);
      const decimalsMap: Record<string, number> = { ...tokenDecimals };

      // Fetch decimals in parallel
      const decimalsPromises = missingAddresses.map(async (address) => {
        try {
          const decimals = await getTokenDecimals(address);
          return { address, decimals };
        } catch (error) {
          console.error(
            `Failed to fetch decimals for token ${address}:`,
            error
          );
          return { address, decimals: 18 }; // Default to 18
        }
      });

      const results = await Promise.all(decimalsPromises);
      results.forEach(({ address, decimals }) => {
        decimalsMap[address] = decimals;
      });

      setTokenDecimals(decimalsMap);
      setTokenDecimalsLoading(false);
    };

    if (!tokenDecimalsLoading) {
      fetchTokenDecimals();
    }
  }, [
    aggregations?.token_totals,
    entryFeeToken,
    distributionPrizes,
    tournamentCreatorShare,
    gameCreatorShare,
    tokenDecimalsLoading,
    tokenDecimals,
    getTokenDecimals,
  ]);

  console.log(tokenDecimals);

  const entryFeePrice = prices[entryFeeTokenSymbol ?? ""];
  const entryFeeLoading = isTokenLoading(entryFeeTokenSymbol ?? "");

  const entryFee = hasEntryFee
    ? (() => {
        const entryFeeDecimals = tokenDecimals[entryFeeToken ?? ""] || 18;
        return (
          Number(
            BigInt(tournamentModel?.entry_fee.Some?.amount!) /
              10n ** BigInt(entryFeeDecimals)
          ) * Number(entryFeePrice)
        ).toFixed(2);
      })()
    : "Free";

  const isStarted =
    Number(tournamentModel?.schedule.game.start) <
    Number(BigInt(Date.now()) / 1000n);

  const isEnded =
    Number(tournamentModel?.schedule.game.end) <
    Number(BigInt(Date.now()) / 1000n);

  const isSubmitted =
    Number(
      BigInt(tournamentModel?.schedule.game.end ?? 0n) +
        BigInt(tournamentModel?.schedule.submission_duration ?? 0n)
    ) < Number(BigInt(Date.now()) / 1000n);

  const startsIn =
    Number(tournamentModel?.schedule.game.start) -
    Number(BigInt(Date.now()) / 1000n);
  const endsIn =
    Number(tournamentModel?.schedule.game.end) -
    Number(BigInt(Date.now()) / 1000n);
  const submissionEndsIn =
    Number(
      BigInt(tournamentModel?.schedule.game.end ?? 0n) +
        BigInt(tournamentModel?.schedule.submission_duration ?? 0n)
    ) - Number(BigInt(Date.now()) / 1000n);

  const status = useMemo(() => {
    if (isSubmitted) return "finalized";
    if (isEnded && !isSubmitted) return "in submission";
    if (isStarted) return "live";
    return "upcoming";
  }, [isStarted, isEnded, isSubmitted]);

  // handle fetching of tournament data if there is a tournament entry requirement

  const tournament: CairoCustomEnum =
    tournamentModel?.entry_requirement.Some?.entry_requirement_type?.variant
      ?.tournament;

  const tournamentVariant = tournament?.activeVariant();

  const tournamentIdsQuery = useMemo(() => {
    if (tournamentVariant === "winners") {
      return tournamentModel.entry_requirement.Some?.entry_requirement_type?.variant?.tournament?.variant?.winners?.map(
        (winner: any) => addAddressPadding(bigintToHex(winner))
      );
    } else if (tournamentVariant === "participants") {
      return tournamentModel.entry_requirement.Some?.entry_requirement_type?.variant?.tournament?.variant?.participants?.map(
        (participant: any) => addAddressPadding(bigintToHex(participant))
      );
    }
    return [];
  }, [tournamentModel]);

  const { data: tournaments } = useGetTournaments({
    namespace: namespace,
    gameFilters: [],
    limit: 100,
    status: "tournaments",
    tournamentIds: tournamentIdsQuery,
    active: tournamentIdsQuery.length > 0,
  });

  const tournamentsData = tournaments?.map((tournament) => {
    return {
      ...processTournamentFromSql(tournament),
      entry_count: tournament.entry_count,
    };
  });

  const { settings } = useSettings({
    gameAddresses: [gameAddress],
    settingsIds: [Number(tournamentModel?.game_config?.settings_id)],
  });

  if (loading) {
    return <LoadingPage message={`Loading tournament...`} />;
  }

  if (!tournamentExists) {
    return <NotFound message={`Tournament not found: ${id}`} />;
  }

  return (
    <div className="lg:w-[87.5%] xl:w-5/6 2xl:w-3/4 sm:mx-auto flex flex-col gap-5 h-full">
      <div className="flex flex-row items-center justify-between h-12">
        <Button
          variant="outline"
          className="px-2"
          onClick={() => navigate("/")}
        >
          <ARROW_LEFT />
          <span className="hidden sm:block">Back</span>
        </Button>
        <div className="flex flex-row items-center gap-2 sm:gap-5">
          <span className="text-brand uppercase font-brand text-lg sm:text-2xl">
            {status}
          </span>
          <Tooltip delayDuration={50}>
            <TooltipTrigger asChild>
              <div
                className="flex items-center justify-center cursor-pointer"
                onClick={() => setSettingsDialogOpen(true)}
              >
                <TokenGameIcon image={getGameImage(gameAddress)} size={"md"} />
              </div>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              align="center"
              sideOffset={5}
              className="bg-black text-neutral border border-brand-muted px-2 py-1 rounded text-sm z-50"
            >
              {gameName ? gameName : "Unknown"}
            </TooltipContent>
          </Tooltip>
          {settings[0] && (
            <div
              className="hidden sm:flex h-10 text-brand flex-row items-center gap-1 w-full border-2 border-brand-muted p-2 bg-black rounded-lg hover:cursor-pointer"
              onClick={() => setSettingsDialogOpen(true)}
            >
              <span className="w-8">
                <SLIDERS />
              </span>
              <span className="hidden sm:block text-xs">
                {settings[0].name}
              </span>
            </div>
          )}
          <EntryRequirements
            tournamentModel={tournamentModel}
            tournamentsData={tournamentsData}
          />
          {!isEnded && (
            <Button
              variant="outline"
              onClick={() => setAddPrizesDialogOpen(true)}
            >
              <GIFT />{" "}
              <span className="hidden sm:block 3xl:text-lg">Add Prizes</span>
            </Button>
          )}
          {(registrationType === "fixed" && !isStarted) ||
          (registrationType === "open" && !isEnded) ? (
            <Button
              className="uppercase [&_svg]:w-6 [&_svg]:h-6"
              onClick={() => setEnterDialogOpen(true)}
            >
              <span className="hidden sm:block">
                <SPACE_INVADER_SOLID />
              </span>

              <span>Enter</span>
              <span className="hidden sm:block">|</span>
              <span className="hidden sm:block font-bold text-xs sm:text-base 3xl:text-lg">
                {hasEntryFee ? (
                  entryFeeLoading ? (
                    <Skeleton className="bg-neutral w-10 h-6" />
                  ) : (
                    `$${entryFee}`
                  )
                ) : (
                  "Free"
                )}
              </span>
            </Button>
          ) : isEnded && !isSubmitted ? (
            <Button
              className="uppercase"
              onClick={() => setSubmitScoresDialogOpen(true)}
              disabled={allSubmitted}
            >
              <TROPHY />
              {allSubmitted ? "Submitted" : "Submit Scores"}
            </Button>
          ) : isSubmitted ? (
            <Button
              className="uppercase"
              onClick={() => setClaimDialogOpen(true)}
              disabled={allClaimed}
            >
              <MONEY />
              {claimablePrizeTypes.length === 0 ? (
                <span className="hidden sm:block">No Prizes</span>
              ) : allClaimed ? (
                <span className="hidden sm:block">Prizes Claimed</span>
              ) : (
                <>
                  <span className="hidden sm:block">Send Prizes |</span>
                  <span className="font-bold">{claimablePrizes.length}</span>
                </>
              )}
            </Button>
          ) : (
            <></>
          )}
          <EnterTournamentDialog
            open={enterDialogOpen}
            onOpenChange={setEnterDialogOpen}
            hasEntryFee={hasEntryFee}
            entryFeePrice={entryFeePrice}
            tournamentModel={tournamentModel}
            entryCountModel={entryCountModel}
            // gameCount={gameCount}
            tokens={tournamentTokens}
            tournamentsData={tournamentsData}
            duration={durationSeconds}
            totalPrizesValueUSD={totalPrizesValueUSD}
          />
          <SubmitScoresDialog
            open={submitScoresDialogOpen}
            onOpenChange={setSubmitScoresDialogOpen}
            tournamentModel={tournamentModel}
            leaderboard={leaderboardModel}
          />
          <ClaimPrizesDialog
            open={claimDialogOpen}
            onOpenChange={setClaimDialogOpen}
            tournamentModel={tournamentModel}
            claimablePrizes={claimablePrizes}
            claimablePrizeTypes={claimablePrizeTypes}
            prices={prices}
          />
          <AddPrizesDialog
            open={addPrizesDialogOpen}
            onOpenChange={setAddPrizesDialogOpen}
            tournamentId={tournamentModel?.id}
            tournamentName={feltToString(tournamentModel?.metadata?.name ?? "")}
            leaderboardSize={leaderboardSize}
          />
          <SettingsDialog
            open={settingsDialogOpen}
            onOpenChange={setSettingsDialogOpen}
            game={gameAddress}
            settings={settings[0]}
          />
        </div>
      </div>
      <div className="flex flex-col gap-5 overflow-y-auto pb-5 sm:pb-0">
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className="flex flex-row items-center h-8 sm:h-12 justify-between">
            <div className="flex flex-row gap-5">
              <span className="font-brand text-xl xl:text-2xl 2xl:text-4xl 3xl:text-5xl">
                {feltToString(tournamentModel?.metadata?.name ?? "")}
              </span>
              <div className="flex flex-row items-center gap-4 text-brand-muted 3xl:text-lg">
                <div className="flex flex-row gap-2 hidden sm:flex">
                  <span>Winners:</span>
                  <span className="text-brand">Top {leaderboardSize}</span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs p-1 rounded-md sm:hidden text-brand"
                >
                  {leaderboardSize} Winners
                </Badge>
                <div className="flex flex-row gap-2 hidden sm:flex">
                  <span>Registration:</span>
                  <span className="text-brand">
                    {registrationType.charAt(0).toUpperCase() +
                      registrationType.slice(1)}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs p-1 rounded-md sm:hidden text-brand"
                >
                  Open
                </Badge>
              </div>
            </div>
            <div className="hidden sm:flex flex-row 3xl:text-lg">
              {!isStarted ? (
                <div>
                  <span className="text-brand-muted">Starts In: </span>
                  <span className="text-brand">{formatTime(startsIn)}</span>
                </div>
              ) : !isEnded ? (
                <div>
                  <span className="text-brand-muted">Ends In: </span>
                  <span className="text-brand">{formatTime(endsIn)}</span>
                </div>
              ) : !isSubmitted ? (
                <div>
                  <span className="text-brand-muted">Submission Ends In: </span>
                  <span className="text-brand">
                    {formatTime(submissionEndsIn)}
                  </span>
                </div>
              ) : (
                <></>
              )}
            </div>
          </div>
          <div
            className={`flex ${
              isExpanded ? "flex-col" : "flex-row items-center"
            }`}
          >
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
                    ? "whitespace-pre-wrap text-xs sm:text-base"
                    : "overflow-hidden text-ellipsis whitespace-nowrap text-xs sm:text-sm xl:text-base 3xl:text-lg"
                }`}
              >
                {tournamentModel?.metadata?.description &&
                  tournamentModel?.metadata?.description
                    ?.replace("Opus.Cash", "https://opus.money")
                    .split(/(https?:\/\/[^\s]+?)([.,;:!?])?(?=\s|$)/g)
                    .map((part: string, i: number, arr: string[]) => {
                      if (part && part.match(/^https?:\/\//)) {
                        // This is a URL
                        return (
                          <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-muted hover:underline"
                          >
                            {part}
                          </a>
                        );
                      } else if (
                        i > 0 &&
                        arr[i - 1] &&
                        typeof arr[i - 1] === "string" &&
                        arr[i - 1].match(/^https?:\/\//) &&
                        part &&
                        /^[.,;:!?]$/.test(part)
                      ) {
                        // This is punctuation that followed a URL
                        return part;
                      } else {
                        // This is regular text
                        return part;
                      }
                    })}
              </p>
            </div>
            {isOverflowing && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="self-start text-brand hover:text-brand-muted font-bold text-sm sm:text-base"
              >
                {isExpanded ? "See Less" : "See More"}
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-5 sm:gap-10">
          <div className="flex flex-col sm:flex-row sm:h-[150px] 3xl:h-[200px] gap-5">
            <div className="sm:w-1/2 flex justify-center items-center pt-4 sm:pt-0">
              <TournamentTimeline
                type={registrationType}
                createdTime={Number(tournamentModel?.created_at ?? 0)}
                startTime={Number(tournamentModel?.schedule.game.start ?? 0)}
                duration={durationSeconds ?? 0}
                submissionPeriod={Number(
                  tournamentModel?.schedule.submission_duration ?? 0
                )}
                pulse={true}
              />
            </div>
            <PrizesContainer
              tournamentId={tournamentModel?.id}
              tokens={tournamentTokens}
              tokenDecimals={tokenDecimals}
              entryFeePrizes={[
                ...distributionPrizes,
                ...tournamentCreatorShare,
                ...gameCreatorShare,
              ]}
              prices={prices}
              pricesLoading={pricesLoading}
              aggregations={aggregations}
              aggregationsLoading={aggregationsLoading}
              totalPrizesValueUSD={totalPrizesValueUSD}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-5">
            <ScoreTable
              tournamentId={tournamentModel?.id}
              entryCount={entryCountModel ? Number(entryCountModel.count) : 0}
              gameAddress={tournamentModel?.game_config?.address}
              isStarted={isStarted}
              isEnded={isEnded}
            />
            <MyEntries
              tournamentId={tournamentModel?.id}
              gameAddress={tournamentModel?.game_config?.address}
              tournamentModel={tournamentModel}
              totalEntryCount={
                entryCountModel ? Number(entryCountModel.count) : 0
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tournament;
