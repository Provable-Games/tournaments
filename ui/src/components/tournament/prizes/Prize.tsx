import { motion } from "framer-motion";
import { getOrdinalSuffix } from "@/lib/utils";
import {
  calculatePrizeValue,
  calculateTotalValue,
  countTotalNFTs,
} from "@/lib/utils/formatting";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { TokenPrices } from "@/hooks/useEkuboPrices";
import { TokenPrizes } from "@/lib/types";
import { getTokenLogoUrl } from "@/lib/tokensMeta";
import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface PrizeProps {
  position: number;
  prizes: TokenPrizes;
  prices: TokenPrices;
}

const Prize = ({ position, prizes, prices }: PrizeProps) => {
  const totalPrizeNFTs = countTotalNFTs(prizes);
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const [allPricesFound, setAllPricesFound] = useState(false);
  const totalPrizesValueUSD = calculateTotalValue(
    prizes,
    prices,
    allPricesFound
  );

  useEffect(() => {
    const allPricesExist = Object.keys(prizes).every(
      (address) => prices[address] !== undefined
    );

    setAllPricesFound(allPricesExist);
  }, [prices, prizes]);

  // Function to render prize details content
  const renderPrizeDetails = () => (
    <div className="space-y-2">
      <h4 className="font-medium font-brand pt-4 px-4">
        {position}
        <sup>{getOrdinalSuffix(position)}</sup> Prize
      </h4>
      <div className="space-y-3">
        {Object.entries(prizes).map(([address, prize]) => {
          const hasPrice = prices[address];
          const USDValue = calculatePrizeValue(prize, address, prices);
          return (
            <div
              key={address}
              className="flex justify-between items-center px-4"
            >
              {prize.type === "erc20" ? (
                <div className="flex flex-row gap-1 items-center">
                  <span>{`${(Number(prize.value) / 10 ** 18).toFixed(
                    2
                  )}`}</span>
                  <img
                    src={getTokenLogoUrl(prize.address)}
                    className="w-6 h-6"
                  />
                </div>
              ) : (
                `${(prize.value as bigint[]).length} NFT${
                  (prize.value as bigint[]).length === 1 ? "" : "s"
                }`
              )}
              {prize.type === "erc20" && hasPrice && (
                <span className="text-neutral">~${USDValue.toFixed(2)}</span>
              )}
            </div>
          );
        })}
        {totalPrizesValueUSD > 0 && (
          <div className="pt-2 border-t border-brand/50">
            <div className="flex justify-between items-center px-4 pb-4">
              <span className="font-brand">Total</span>
              <span>${totalPrizesValueUSD.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop hover card (hidden on mobile) */}
      <div className="hidden sm:block">
        <HoverCard openDelay={50} closeDelay={0}>
          <HoverCardTrigger asChild>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: position * 0.1 }}
              className="flex items-center gap-4 p-2 sm:p-3 rounded-lg border border-brand/20 w-fit hover:cursor-pointer hover:bg-brand/25 hover:border-brand/30 transition-all duration-200"
            >
              <div className="flex items-center justify-center w-6 h-6 xl:w-8 xl:h-8 3xl:w-10 3xl:h-10 rounded-full bg-brand/20">
                <span className="font-brand xl:text-lg 3xl:text-2xl text-brand">
                  {position}
                  <sup>{getOrdinalSuffix(position)}</sup>
                </span>
              </div>
              {totalPrizesValueUSD > 0 || totalPrizeNFTs > 0 ? (
                <div className="flex flex-row items-center gap-2 font-brand xl:text-lg 3xl:text-2xl">
                  {totalPrizesValueUSD > 0 && (
                    <span>{`${
                      allPricesFound ? "$" : ""
                    }${totalPrizesValueUSD.toFixed(2)}`}</span>
                  )}
                  {totalPrizesValueUSD > 0 && totalPrizeNFTs > 0 && (
                    <span className="text-brand/25">|</span>
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
            </motion.div>
          </HoverCardTrigger>
          <HoverCardContent
            className="w-48 p-0 text-sm z-50"
            align="center"
            side="top"
            sideOffset={5}
          >
            {renderPrizeDetails()}
          </HoverCardContent>
        </HoverCard>
      </div>

      {/* Mobile clickable element (hidden on desktop) */}
      <motion.div
        className="sm:hidden flex items-center gap-4 p-2 rounded-lg border border-brand/20 w-fit hover:cursor-pointer hover:bg-brand/25 hover:border-brand/30 transition-all duration-200"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: position * 0.1 }}
        onClick={() => setIsMobileDialogOpen(true)}
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-brand/20">
          <span className="font-brand text-brand">
            {position}
            <sup>{getOrdinalSuffix(position)}</sup>
          </span>
        </div>
        {totalPrizesValueUSD > 0 || totalPrizeNFTs > 0 ? (
          <div className="flex flex-row items-center gap-2 font-brand">
            {totalPrizesValueUSD > 0 && (
              <span>${totalPrizesValueUSD.toFixed(2)}</span>
            )}
            {totalPrizesValueUSD > 0 && totalPrizeNFTs > 0 && (
              <span className="text-brand/25">|</span>
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
      </motion.div>

      {/* Mobile dialog for prize details */}
      <Dialog open={isMobileDialogOpen} onOpenChange={setIsMobileDialogOpen}>
        <DialogContent className="sm:hidden bg-black border border-brand p-0 rounded-lg max-w-[90vw] mx-auto">
          {renderPrizeDetails()}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Prize;
