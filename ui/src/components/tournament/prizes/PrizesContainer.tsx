import { QUESTION, TROPHY } from "@/components/Icons";
import PrizeDisplay from "@/components/tournament/prizes/Prize";
import { useState, useEffect } from "react";
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

interface PrizesContainerProps {
  prizesExist: boolean;
  lowestPrizePosition: number;
  groupedPrizes: PositionPrizes;
  totalPrizesValueUSD: number;
  totalPrizeNFTs: number;
  prices: TokenPrices;
  pricesLoading: boolean;
  allPricesFound: boolean;
}

const PrizesContainer = ({
  prizesExist,
  lowestPrizePosition,
  groupedPrizes,
  totalPrizesValueUSD,
  totalPrizeNFTs,
  prices,
  pricesLoading,
  allPricesFound,
}: PrizesContainerProps) => {
  const [showPrizes, setShowPrizes] = useState(false);

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
                {allPricesFound ? (
                  totalPrizesValueUSD > 0 && (
                    <span className="font-brand text-md xl:text-lg 2xl:text-xl 3xl:text-2xl text-brand-muted">
                      ${totalPrizesValueUSD.toFixed(2)}
                    </span>
                  )
                ) : (
                  <span className="w-8">
                    <QUESTION />
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
      <TournamentCardContent showContent={showPrizes}>
        <div className="p-2 sm:p-4">
          {prizesExist && (
            <div className="flex flex-row gap-3 overflow-x-auto pb-2">
              {pricesLoading ? (
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
                        prices={prices}
                      />
                    ))}
                </>
              )}
            </div>
          )}
        </div>
      </TournamentCardContent>
    </TournamentCard>
  );
};

export default PrizesContainer;
