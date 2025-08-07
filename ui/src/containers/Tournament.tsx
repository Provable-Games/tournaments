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
import {
  Tournament as TournamentModel,
  Prize,
  Token,
  EntryCount,
  getModelsMapping,
  PrizeClaim,
  Leaderboard,
} from "@/generated/models.gen";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { useDojo } from "@/context/dojo";
import {
  calculateTotalValue,
  countTotalNFTs,
  extractEntryFeePrizes,
  formatTokens,
  getClaimablePrizes,
  getErc20TokenSymbols,
  groupPrizesByPositions,
  groupPrizesByTokens,
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
import { Skeleton } from "@/components/ui/skeleton";
import LoadingPage from "@/containers/LoadingPage";
import { ChainId } from "@/dojo/setup/networks";
import { Badge } from "@/components/ui/badge";
import { SettingsDialog } from "@/components/dialogs/Settings";
import { useSettings } from "metagame-sdk/sql";

const Tournament = () => {
  const { id } = useParams<{ id: string }>();
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();
  const { namespace, selectedChainConfig } = useDojo();
  const state = useDojoStore((state) => state);
  const { gameData, getGameImage } = useUIStore();
  const [enterDialogOpen, setEnterDialogOpen] = useState(false);
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [submitScoresDialogOpen, setSubmitScoresDialogOpen] = useState(false);
  const [addPrizesDialogOpen, setAddPrizesDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tournamentExists, setTournamentExists] = useState(false);
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
        }, 5000);
      }
    };

    checkTournament();

    // Clean up the timeout if the component unmounts or dependencies change
    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [id, tournamentsCount]);

  useGetTournamentQuery(addAddressPadding(bigintToHex(id!)), namespace);
  // useSubscribeTournamentQuery(addAddressPadding(bigintToHex(id!)), namespace);

  const tournamentEntityId = useMemo(
    () => getEntityIdFromKeys([BigInt(id!)]),
    [id]
  );

  const tournamentModel = state.getEntity(tournamentEntityId)?.models[namespace]
    ?.Tournament as TournamentModel;

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

  const tournamentPrizes = state.getEntitiesByModel(namespace, "Prize");

  const prizes: Prize[] = (tournamentPrizes
    ?.filter(
      (detail) =>
        detail.models?.[namespace]?.Prize?.tournament_id === Number(id)
    )
    .map((detail) => detail.models[namespace].Prize) ??
    []) as unknown as Prize[];

  const { tournamentCreatorShare, gameCreatorShare, distributionPrizes } =
    extractEntryFeePrizes(
      tournamentModel?.id,
      tournamentModel?.entry_fee,
      entryCountModel?.count ?? 0
    );

  const allPrizes = [...distributionPrizes, ...prizes];

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
    claimedPrizes,
    totalSubmissions
  );

  const allClaimed = claimablePrizes.length === 0;

  const tokenModels = state.getEntitiesByModel(namespace, "Token");
  const registeredTokens = tokenModels.map(
    (model) => model.models[namespace].Token
  ) as Token[];

  const isSepolia = selectedChainConfig.chainId === ChainId.SN_SEPOLIA;
  const isMainnet = selectedChainConfig.chainId === ChainId.SN_MAIN;
  const tokens = formatTokens(registeredTokens, isMainnet, isSepolia);

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

  const {
    prices,
    isLoading: pricesLoading,
    isTokenLoading,
  } = useEkuboPrices({
    tokens: [
      ...erc20TokenSymbols,
      ...(entryFeeTokenSymbol ? [entryFeeTokenSymbol] : []),
    ],
  });

  const totalPrizesValueUSD = calculateTotalValue(
    groupedByTokensPrizes,
    prices
  );

  const totalPrizeNFTs = countTotalNFTs(groupedByTokensPrizes);

  const entryFeePrice = prices[entryFeeTokenSymbol ?? ""];
  const entryFeeLoading = isTokenLoading(entryFeeTokenSymbol ?? "");

  const entryFee = hasEntryFee
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
    if (isSubmitted) return "finalized";
    if (isEnded && !isSubmitted) return "in submission";
    if (isStarted) return "live";
    return "upcoming";
  }, [isStarted, isEnded, isSubmitted]);

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

  const { data: setting } = useSettings({
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
          {setting[0] && (
            <div
              className="hidden sm:flex h-10 text-brand flex-row items-center gap-1 w-full border-2 border-brand-muted p-2 bg-black rounded-lg hover:cursor-pointer"
              onClick={() => setSettingsDialogOpen(true)}
            >
              <span className="w-8">
                <SLIDERS />
              </span>
              <span className="hidden sm:block text-xs">{setting[0].name}</span>
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
            entryFeePrice={entryFeePrice}
            tournamentModel={tournamentModel}
            entryCountModel={entryCountModel}
            // gameCount={gameCount}
            tokens={tokens}
            tournamentsData={tournamentsData}
            duration={durationSeconds}
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
            settings={setting[0]}
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
              prizesExist={hasPrizes}
              lowestPrizePosition={lowestPrizePosition}
              groupedPrizes={groupedPrizes}
              totalPrizesValueUSD={totalPrizesValueUSD}
              totalPrizeNFTs={totalPrizeNFTs}
              prices={prices}
              pricesLoading={pricesLoading}
              tokens={tokens}
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
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tournament;
