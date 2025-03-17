import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  ARROW_LEFT,
  TROPHY,
  MONEY,
  GIFT,
  SPACE_INVADER_SOLID,
} from "@/components/Icons";
import { useNavigate, useParams } from "react-router-dom";
import EntrantsTable from "@/components/tournament/table/EntrantsTable";
import TournamentTimeline from "@/components/TournamentTimeline";
import {
  bigintToHex,
  feltToString,
  formatTime,
  indexAddress,
} from "@/lib/utils";
import { addAddressPadding, CairoCustomEnum } from "starknet";
import { useAccount } from "@starknet-react/core";
import {
  useSubscribeGamesQuery,
  // useGetGameCounterQuery,
  useGetTournamentQuery,
  useSubscribeTournamentQuery,
  useSubscribeScoresQuery,
  useGetScoresQuery,
} from "@/dojo/hooks/useSdkQueries";
import { getEntityIdFromKeys } from "@dojoengine/utils";
import {
  Tournament as TournamentModel,
  Prize,
  Token,
  EntryCount,
  ModelsMapping,
  PrizeClaim,
  Leaderboard,
} from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { useDojo } from "@/context/dojo";
import {
  calculateTotalValue,
  countTotalNFTs,
  extractEntryFeePrizes,
  getClaimablePrizes,
  getErc20TokenSymbols,
  groupPrizesByPositions,
  groupPrizesByTokens,
  processTournamentFromSql,
} from "@/lib/utils/formatting";
import useModel from "@/dojo/hooks/useModel";
import { useGameEndpoints } from "@/dojo/hooks/useGameEndpoints";
import { EnterTournamentDialog } from "@/components/dialogs/EnterTournament";
import ScoreTable from "@/components/tournament/table/ScoreTable";
import { ADMIN_ADDRESS } from "@/lib/constants";
import { useEkuboPrices } from "@/hooks/useEkuboPrices";
import MyEntries from "@/components/tournament/MyEntries";
import TokenGameIcon from "@/components/icons/TokenGameIcon";
import EntryRequirements from "@/components/tournament/EntryRequirements";
import PrizesContainer from "@/components/tournament/prizes/PrizesContainer";
import { ClaimPrizesDialog } from "@/components/dialogs/ClaimPrizes";
import { SubmitScoresDialog } from "@/components/dialogs/SubmitScores";
import {
  useGetAccountTokenIds,
  useGetTournaments,
  useGetTournamentsCount,
} from "@/dojo/hooks/useSqlQueries";
import NotFound from "@/containers/NotFound";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useUIStore from "@/hooks/useUIStore";
import { AddPrizesDialog } from "@/components/dialogs/AddPrizes";
import { ChainId } from "@/dojo/config";

const Tournament = () => {
  const { id } = useParams<{ id: string }>();
  const { address } = useAccount();
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { nameSpace, selectedChainConfig } = useDojo();
  const state = useDojoStore((state) => state);
  const { gameData } = useUIStore();
  const [enterDialogOpen, setEnterDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [submitScoresDialogOpen, setSubmitScoresDialogOpen] = useState(false);
  const [addPrizesDialogOpen, setAddPrizesDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tournamentExists, setTournamentExists] = useState(false);
  const [allPricesFound, setAllPricesFound] = useState(true);
  const isAdmin = address === ADMIN_ADDRESS;
  const isMainnet = selectedChainConfig.chainId === ChainId.SN_MAIN;

  const { data: tournamentsCount } = useGetTournamentsCount({
    namespace: nameSpace,
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
        }, 5000);
      }
    };

    checkTournament();

    // Clean up the timeout if the component unmounts or dependencies change
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [id, tournamentsCount]);

  useGetTournamentQuery(addAddressPadding(bigintToHex(id!)));
  useSubscribeTournamentQuery(addAddressPadding(bigintToHex(id!)));
  // useSubscribePrizesQuery();

  const tournamentEntityId = useMemo(
    () => getEntityIdFromKeys([BigInt(id!)]),
    [id]
  );

  const tournamentModel = state.getEntity(tournamentEntityId)?.models[nameSpace]
    ?.Tournament as TournamentModel;

  const entryCountModel = useModel(
    tournamentEntityId,
    ModelsMapping.EntryCount
  ) as unknown as EntryCount;

  const leaderboardModel = useModel(
    tournamentEntityId,
    ModelsMapping.Leaderboard
  ) as unknown as Leaderboard;

  const leaderboardSize = Number(tournamentModel?.game_config.prize_spots);

  const totalSubmissions = leaderboardModel?.token_ids.length ?? 0;

  const allSubmitted =
    totalSubmissions ===
    Math.min(Number(entryCountModel?.count), leaderboardSize);

  const tournamentPrizes = state.getEntitiesByModel(nameSpace, "Prize");

  const prizes: Prize[] = (tournamentPrizes
    ?.filter(
      (detail) =>
        detail.models?.[nameSpace]?.Prize?.tournament_id === Number(id)
    )
    .map((detail) => detail.models[nameSpace].Prize) ??
    []) as unknown as Prize[];

  const entryFeePrizes = extractEntryFeePrizes(
    tournamentModel?.id,
    tournamentModel?.entry_fee,
    entryCountModel?.count ?? 0
  );

  const allPrizes = [...entryFeePrizes, ...prizes];

  const tournamentClaimedPrizes = state.getEntitiesByModel(
    nameSpace,
    "PrizeClaim"
  );

  const claimedPrizes: PrizeClaim[] = (tournamentClaimedPrizes
    ?.filter(
      (detail) =>
        detail.models?.[nameSpace]?.PrizeClaim?.tournament_id === Number(id)
    )
    .map((detail) => detail.models[nameSpace].PrizeClaim) ??
    []) as unknown as PrizeClaim[];

  const { claimablePrizes, claimablePrizeTypes } = getClaimablePrizes(
    allPrizes,
    claimedPrizes,
    totalSubmissions
  );

  const allClaimed = claimablePrizes.length === 0;

  const tokenModels = state.getEntitiesByModel(nameSpace, "Token");
  const tokens = tokenModels.map(
    (model) => model.models[nameSpace].Token
  ) as Token[];

  const { gameNamespace, gameScoreModel, gameScoreAttribute } =
    useGameEndpoints(tournamentModel?.game_config?.address);

  const gameAddress = tournamentModel?.game_config?.address;
  const gameName = gameData.find(
    (game) => game.contract_address === gameAddress
  )?.name;

  // subscribe and fetch game scores
  useSubscribeScoresQuery(
    gameNamespace ?? undefined,
    gameScoreModel ?? undefined
  );
  useGetScoresQuery(gameNamespace ?? "", gameScoreModel ?? "");

  // const { entity: gameCounterEntity } = useGetGameCounterQuery({
  //   key: addAddressPadding(BigInt(TOURNAMENT_VERSION_KEY)),
  //   nameSpace: gameNamespace ?? "",
  // });

  // const gameCount = gameCounterEntity?.GameCounter?.count ?? 0;

  useSubscribeGamesQuery({
    gameNamespace: gameNamespace ?? "",
  });

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
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, [tournamentModel?.metadata.description]);

  const groupedByTokensPrizes = groupPrizesByTokens(allPrizes, tokens);

  const erc20TokenSymbols = getErc20TokenSymbols(groupedByTokensPrizes);

  const durationSeconds = Number(
    BigInt(tournamentModel?.schedule?.game?.end ?? 0n) -
      BigInt(tournamentModel?.schedule?.game?.start ?? 0n)
  );

  const registrationType = tournamentModel?.schedule.registration.isNone()
    ? "open"
    : "fixed";

  const groupedPrizes = groupPrizesByPositions(allPrizes, tokens);

  const lowestPrizePosition =
    Object.keys(groupedPrizes).length > 0
      ? Math.max(...Object.keys(groupedPrizes).map(Number))
      : 0;

  const hasEntryFee = tournamentModel?.entry_fee.isSome();

  const entryFeeToken = tournamentModel?.entry_fee.Some?.token_address;
  const entryFeeTokenSymbol = tokens.find(
    (t) => t.address === entryFeeToken
  )?.symbol;

  const { prices, isLoading: pricesLoading } = useEkuboPrices({
    tokens: [
      ...erc20TokenSymbols,
      ...(entryFeeTokenSymbol ? [entryFeeTokenSymbol] : []),
    ],
  });

  useEffect(() => {
    const allPricesExist = Object.keys(prizes).every(
      (symbol) => prices[symbol] !== undefined
    );

    setAllPricesFound(allPricesExist);
  }, [prices, prizes]);

  const totalPrizesValueUSD = calculateTotalValue(
    groupedByTokensPrizes,
    prices,
    allPricesFound
  );

  const totalPrizeNFTs = countTotalNFTs(groupedByTokensPrizes);

  const entryFeePrice = prices[entryFeeTokenSymbol ?? ""];

  const entryFee = tournamentModel?.entry_fee.isSome()
    ? (
        Number(BigInt(tournamentModel?.entry_fee.Some?.amount!) / 10n ** 18n) *
        Number(entryFeePrice)
      ).toFixed(2)
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
    if (isEnded) return "ended";
    if (isStarted) return "live";
    return "upcoming";
  }, [isStarted, isEnded]);

  const hasPrizes = Object.keys(groupedPrizes).length > 0;

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
    namespace: nameSpace,
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

  // get owned game tokens

  const queryAddress = useMemo(() => {
    if (!address || address === "0x0") return null;
    return indexAddress(address);
  }, [address]);

  const queryGameAddress = useMemo(() => {
    if (!gameAddress || gameAddress === "0x0") return null;
    return indexAddress(gameAddress);
  }, [gameAddress]);

  const { data: ownedTokens } = useGetAccountTokenIds(
    queryAddress,
    [queryGameAddress ?? "0x0"],
    true
  );

  if (loading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-black/20 backdrop-blur-sm z-50">
        <div className="relative w-16 h-16">
          <div className="absolute w-full h-full border-4 border-brand rounded-full animate-ping opacity-75"></div>
          <div className="absolute w-full h-full border-4 border-brand-muted rounded-full animate-pulse"></div>
        </div>
        <span className="font-brand text-2xl text-brand-muted animate-pulse">
          Loading tournament...
        </span>
      </div>
    );
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
              <div className="flex items-center justify-center cursor-pointer">
                <TokenGameIcon game={gameAddress} size={"md"} />
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
          <EntryRequirements
            tournamentModel={tournamentModel}
            tournamentsData={tournamentsData}
            tokens={tokens}
          />
          {!isEnded && (isMainnet ? isAdmin : true) && (
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
              <SPACE_INVADER_SOLID />

              <span>Enter</span>
              <span className="hidden sm:block">|</span>
              <span className="hidden sm:block font-bold text-xs sm:text-base 3xl:text-lg">
                {hasEntryFee ? `$${entryFee}` : "Free"}
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
              {allPrizes.length === 0 ? (
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
            entryFee={entryFee}
            tournamentModel={tournamentModel}
            // entryCountModel={entryCountModel}
            // gameCount={gameCount}
            tokens={tokens}
            tournamentsData={tournamentsData}
          />
          <SubmitScoresDialog
            open={submitScoresDialogOpen}
            onOpenChange={setSubmitScoresDialogOpen}
            tournamentModel={tournamentModel}
            nameSpace={nameSpace}
            gameNamespace={gameNamespace ?? ""}
            gameScoreModel={gameScoreModel ?? ""}
            gameScoreAttribute={gameScoreAttribute ?? ""}
            gameAddress={tournamentModel?.game_config?.address}
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
        </div>
      </div>
      <div className="flex flex-col overflow-y-auto pb-5 sm:pb-0">
        <div className="flex flex-col gap-1 sm:gap-2">
          <div className="flex flex-row items-center h-8 sm:h-12 justify-between">
            <div className="flex flex-row gap-5">
              <span className="font-brand text-xl xl:text-2xl 2xl:text-4xl 3xl:text-5xl">
                {feltToString(tournamentModel?.metadata?.name ?? "")}
              </span>
              <div className="flex flex-row items-center gap-4 text-brand-muted 3xl:text-lg">
                <div className="flex flex-row gap-2">
                  <span className="hidden sm:block">Winners:</span>
                  <span className="text-brand">Top {leaderboardSize}</span>
                </div>
                <div className="flex flex-row gap-2">
                  <span className="hidden sm:block">Registration:</span>
                  <span className="text-brand">
                    {registrationType.charAt(0).toUpperCase() +
                      registrationType.slice(1)}
                  </span>
                </div>
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
                {tournamentModel?.metadata?.description}
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
            <div className="sm:w-1/2">
              <PrizesContainer
                prizesExist={hasPrizes}
                lowestPrizePosition={lowestPrizePosition}
                groupedPrizes={groupedPrizes}
                totalPrizesValueUSD={totalPrizesValueUSD}
                totalPrizeNFTs={totalPrizeNFTs}
                prices={prices}
                pricesLoading={pricesLoading}
                allPricesFound={allPricesFound}
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-5">
            {!isStarted ? (
              <EntrantsTable
                tournamentId={tournamentModel?.id}
                entryCount={entryCountModel ? Number(entryCountModel.count) : 0}
                gameAddress={tournamentModel?.game_config?.address}
                gameNamespace={gameNamespace ?? ""}
              />
            ) : isStarted ? (
              <ScoreTable
                tournamentId={tournamentModel?.id}
                entryCount={entryCountModel ? Number(entryCountModel.count) : 0}
                gameAddress={tournamentModel?.game_config?.address}
                gameNamespace={gameNamespace ?? ""}
                gameScoreModel={gameScoreModel ?? ""}
                gameScoreAttribute={gameScoreAttribute ?? ""}
                isEnded={isEnded}
                // leaderboardModel={leaderboardModel}
              />
            ) : (
              <></>
            )}
            <MyEntries
              tournamentId={tournamentModel?.id}
              gameAddress={tournamentModel?.game_config?.address}
              gameNamespace={gameNamespace ?? ""}
              gameScoreModel={gameScoreModel ?? ""}
              gameScoreAttribute={gameScoreAttribute ?? ""}
              ownedTokens={ownedTokens}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tournament;
