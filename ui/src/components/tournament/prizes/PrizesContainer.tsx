import { TROPHY } from "@/components/Icons";
import PrizeDisplay from "@/components/tournament/prizes/Prize";
import { useState, useEffect, useMemo } from "react";
import { TokenPrices } from "@/hooks/useEkuboPrices";
import { PositionPrizes } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TournamentCard,
  TournamentCardContent,
  TournamentCardHeader,
  TournamentCardMetric,
  TournamentCardSwitch,
  TournamentCardTitle,
} from "@/components/tournament/containers/TournamentCard";
import { Token } from "@/generated/models.gen";
import { Button } from "@/components/ui/button";
import { PrizesTableDialog } from "@/components/dialogs/PrizesTable";
import { TableProperties } from "lucide-react";
import { useGetTournamentPrizes } from "@/dojo/hooks/useSqlQueries";
import { useDojo } from "@/context/dojo";
import { BigNumberish } from "starknet";
import { Prize } from "@/generated/models.gen";

interface PrizesContainerProps {
  tournamentId?: BigNumberish;
  tokens: Token[];
  tokenDecimals: Record<string, number>;
  entryFeePrizes?: Prize[];
  prices?: TokenPrices;
  pricesLoading?: boolean;
  aggregations: any;
  aggregationsLoading: boolean;
  totalPrizesValueUSD: number;
}

const PrizesContainer = ({
  tournamentId,
  tokens,
  tokenDecimals,
  entryFeePrizes = [],
  prices,
  pricesLoading,
  aggregations,
  aggregationsLoading,
  totalPrizesValueUSD,
}: PrizesContainerProps) => {
  const { namespace } = useDojo();
  const [showPrizes, setShowPrizes] = useState(false);
  const [showTableDialog, setShowTableDialog] = useState(false);

  // Always fetch top 5 positions for container view
  const { data: prizesData, loading: prizesLoading } = useGetTournamentPrizes({
    namespace,
    tournamentId: tournamentId ?? 0,
    active: !!tournamentId,
    startPosition: 1,
    endPosition: 5,
  });

  // Process prizes data into grouped format (including entry fee prizes for current page)
  const groupedPrizes: PositionPrizes = useMemo(() => {
    if (!prizesData && entryFeePrizes.length === 0) return {};

    // Combine paginated prizes with entry fee prizes that fit in current page
    const currentPagePrizes = prizesData || [];

    // Filter entry fee prizes for top 5 positions
    const relevantEntryFeePrizes = entryFeePrizes.filter(
      (p) => Number(p.payout_position) >= 1 && Number(p.payout_position) <= 5
    );

    // Combine with database prizes
    const combinedPrizes = [...relevantEntryFeePrizes, ...currentPagePrizes];

    return combinedPrizes.reduce((acc: PositionPrizes, prize: any) => {
      const position = prize.payout_position;
      if (!acc[position]) acc[position] = {};

      const isErc20 =
        prize.token_type?.variant?.erc20 || prize.token_type === "erc20";
      const isErc721 =
        prize.token_type?.variant?.erc721 || prize.token_type === "erc721";
      const tokenType = isErc20 ? "erc20" : isErc721 ? "erc721" : "erc20";
      const tokenKey = `${prize.token_address}_${tokenType}`;

      acc[position][tokenKey] = {
        type: tokenType as "erc20" | "erc721",
        payout_position: position,
        address: prize.token_address,
        value:
          tokenType === "erc20"
            ? BigInt(
                prize.token_type?.variant?.erc20?.amount ||
                  prize["token_type.erc20.amount"] ||
                  0
              )
            : BigInt(
                prize.token_type?.variant?.erc721?.token_id ||
                  prize["token_type.erc721.id"] ||
                  0
              ),
      };

      return acc;
    }, {});
  }, [prizesData, entryFeePrizes]);

  // Get prize information from aggregations

  const totalPrizes = (aggregations?.total_prizes || 0) + entryFeePrizes.length;
  const prizesExist = totalPrizes > 0;
  const lowestPrizePosition = Math.max(
    aggregations?.lowest_prize_position || 0,
    ...(entryFeePrizes.length > 0
      ? entryFeePrizes.map((p) => Number(p.payout_position))
      : [0])
  );

  // Calculate total NFTs from aggregated data + entry fee NFTs
  const dbNFTs =
    aggregations?.token_totals?.reduce((count: number, tokenTotal: any) => {
      return (
        count +
        (tokenTotal.tokenType === "erc721"
          ? Number(tokenTotal.nftCount || 0)
          : 0)
      );
    }, 0) || 0;

  const entryFeeNFTs = entryFeePrizes.filter(
    (p) => p.token_type?.variant?.erc721
  ).length;
  const totalPrizeNFTs = dbNFTs + entryFeeNFTs;

  useEffect(() => {
    setShowPrizes(prizesExist);
  }, [prizesExist]);

  return (
    <TournamentCard
      showCard={showPrizes}
      className={showPrizes ? "!h-full" : "h-[60px] 3xl:h-[80px]"}
    >
      <TournamentCardHeader>
        <TournamentCardTitle>
          <div className="flex flex-row items-center gap-2">
            <span className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
              Prizes
            </span>
            {pricesLoading ? (
              <Skeleton className="h-6 w-24 bg-brand/10" />
            ) : (
              <>
                {totalPrizesValueUSD > 0 && (
                  <span className="font-brand text-md xl:text-lg 2xl:text-xl 3xl:text-2xl text-brand-muted">
                    ${totalPrizesValueUSD.toFixed(2)}
                  </span>
                )}
                {totalPrizeNFTs > 0 && (
                  <span className="font-brand text-xl text-brand-muted">
                    {totalPrizeNFTs} NFT{totalPrizeNFTs === 1 ? "" : "s"}
                  </span>
                )}
              </>
            )}
          </div>
        </TournamentCardTitle>
        <div className="flex flex-row items-center gap-2">
          {prizesExist && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTableDialog(true)}
                className="flex items-center gap-2"
              >
                <TableProperties className="w-4 h-4" />
              </Button>
              {/* Removed pagination for container view */}
            </>
          )}
          <TournamentCardSwitch
            checked={showPrizes}
            onCheckedChange={setShowPrizes}
            showSwitch={prizesExist}
            notShowingSwitchLabel="No prizes"
            checkedLabel="Hide"
            uncheckedLabel="Show Prizes"
          />
          <TournamentCardMetric
            icon={<TROPHY />}
            metric={lowestPrizePosition}
          />
        </div>
      </TournamentCardHeader>
      <TournamentCardContent showContent={showPrizes} className="!h-[100px]">
        <div className="p-2 sm:p-4">
          {prizesExist && (
            <div className="flex flex-row gap-3 overflow-x-auto pb-2 w-full">
              {pricesLoading || prizesLoading || aggregationsLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 rounded-lg border border-brand/20 w-fit hover:cursor-pointer"
                  >
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <Skeleton className="h-6 w-full bg-brand/10" />
                  </div>
                ))
              ) : (
                <>
                  {Object.entries(groupedPrizes)
                    .sort(
                      (a, b) =>
                        Number(a[1].payout_position) -
                        Number(b[1].payout_position)
                    )
                    .map(([position, prizes], index) => (
                      <PrizeDisplay
                        key={index}
                        position={Number(position)}
                        prizes={prizes}
                        prices={prices || {}}
                        tokens={tokens}
                        tokenDecimals={tokenDecimals}
                      />
                    ))}
                </>
              )}
            </div>
          )}
        </div>
      </TournamentCardContent>
      {/* Table dialog would need to be updated to fetch all prizes */}
      <PrizesTableDialog
        open={showTableDialog}
        onOpenChange={setShowTableDialog}
        groupedPrizes={groupedPrizes}
        prices={prices || {}}
        tokens={tokens}
        tokenDecimals={tokenDecimals}
        tournamentId={tournamentId}
        entryFeePrizes={entryFeePrizes}
      />
    </TournamentCard>
  );
};

export default PrizesContainer;
