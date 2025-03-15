import { QUESTION, TROPHY } from "@/components/Icons";
import { Card } from "@/components/ui/card";
import PrizeDisplay from "@/components/tournament/prizes/Prize";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { TokenPrices } from "@/hooks/useEkuboPrices";
import { PositionPrizes } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

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
    <Card
      variant="outline"
      className={`w-full transition-all duration-300 ease-in-out ${
        showPrizes ? "h-full" : "h-[60px]"
      }`}
    >
      <div className="flex flex-col">
        <div className="flex flex-row justify-between h-6 sm:h-8 3xl:h-10">
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
          <div className="flex flex-row items-center gap-2">
            {prizesExist ? (
              <>
                <span className="text-sm xl:text-base 3xl:text-lg text-neutral">
                  {showPrizes ? "Hide" : "Show Prizes"}
                </span>
                <Switch checked={showPrizes} onCheckedChange={setShowPrizes} />
              </>
            ) : (
              <span className="text-neutral">No Prizes Added</span>
            )}
            <div className="flex flex-row items-center font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
              <span className="w-6 xl:w-8 3xl:w-10">
                <TROPHY />
              </span>
              : {lowestPrizePosition}
            </div>
          </div>
        </div>
        <div
          className={`transition-all duration-300 delay-150 ease-in-out ${
            showPrizes ? "h-auto opacity-100" : "h-0 opacity-0"
          } overflow-hidden`}
        >
          <div className="w-full h-0.5 bg-brand/25 mt-2" />
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
        </div>
      </div>
    </Card>
  );
};

export default PrizesContainer;
