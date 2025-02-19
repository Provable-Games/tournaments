import { TROPHY } from "@/components/Icons";
import { Card } from "@/components/ui/card";
import PrizeDisplay from "@/components/tournament/prizes/Prize";
import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";

interface PrizesContainerProps {
  prizesExist: boolean;
  lowestPrizePosition: number;
  groupedPrizes: Record<
    string,
    Record<
      string,
      {
        type: "erc20" | "erc721";
        payout_position: string;
        address: string;
        value: bigint[] | bigint;
      }
    >
  >;
}

const PrizesContainer = ({
  prizesExist,
  lowestPrizePosition,
  groupedPrizes,
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
        <div className="flex flex-row justify-between h-8">
          <span className="font-astronaut text-2xl">Prizes</span>
          <div className="flex flex-row items-center gap-2">
            {prizesExist ? (
              <>
                <span className="text-neutral-500">
                  {showPrizes ? "Hide" : "Show Prizes"}
                </span>
                <Switch checked={showPrizes} onCheckedChange={setShowPrizes} />
              </>
            ) : (
              <span className="text-neutral-500">No Prizes Added</span>
            )}
            <div className="flex flex-row items-center font-astronaut text-2xl">
              <span className="w-8">
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
          <div className="w-full h-0.5 bg-retro-green/25 mt-2" />
          <div className="p-4">
            {prizesExist && (
              <div className="flex flex-row gap-3">
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
                    />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PrizesContainer;
