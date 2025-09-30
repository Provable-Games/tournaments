import { motion } from "framer-motion";
import { formatNumber, getOrdinalSuffix } from "@/lib/utils";
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
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Token } from "@/generated/models.gen";
import { QUESTION } from "@/components/Icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDojo } from "@/context/dojo";
import { useSystemCalls } from "@/dojo/hooks/useSystemCalls";
import { useEffect, useState } from "react";

interface PrizeProps {
  position: number;
  prizes: TokenPrizes;
  prices: TokenPrices;
  tokens: Token[];
}

const Prize = ({ position, prizes, prices, tokens }: PrizeProps) => {
  const { selectedChainConfig } = useDojo();
  const { getTokenDecimals } = useSystemCalls();
  const totalPrizeNFTs = countTotalNFTs(prizes);
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const [tokenDecimals, setTokenDecimals] = useState<Record<string, number>>({});
  
  // Fetch token decimals for all ERC20 prizes
  useEffect(() => {
    const fetchDecimals = async () => {
      const erc20Addresses = Object.values(prizes)
        .filter(prize => prize.type === "erc20")
        .map(prize => prize.address);
      
      const decimalsPromises = erc20Addresses.map(async (address) => {
        if (!tokenDecimals[address]) {
          const decimals = await getTokenDecimals(address);
          return { address, decimals };
        }
        return { address, decimals: tokenDecimals[address] };
      });

      const results = await Promise.all(decimalsPromises);
      const newDecimals = results.reduce((acc, { address, decimals }) => {
        acc[address] = decimals;
        return acc;
      }, {} as Record<string, number>);

      setTokenDecimals(prev => ({ ...prev, ...newDecimals }));
    };

    fetchDecimals();
  }, [prizes, getTokenDecimals]);

  const totalPrizesValueUSD = calculateTotalValue(prizes, prices, tokenDecimals);

  const chainId = selectedChainConfig?.chainId ?? "";

  // Function to render prize details content
  const renderPrizeDetails = () => (
    <div className="flex flex-col gap-2">
      <div className="pt-4 px-4">
        <h4 className="font-brand">
          {position}
          <sup>{getOrdinalSuffix(position)}</sup> Prize
        </h4>
      </div>
      <div className="w-full bg-brand/50 h-0.5" />
      <div className="flex flex-col gap-2">
        {Object.entries(prizes)
          .map(([symbol, prize]) => {
            const hasPrice = prices[symbol];
            const USDValue = calculatePrizeValue(prize, symbol, prices);
            return {
              symbol,
              prize,
              hasPrice,
              USDValue,
            };
          })
          .sort((a, b) => b.USDValue - a.USDValue) // Sort by USDValue in descending order
          .map(({ symbol, prize, hasPrice, USDValue }) => {
            const token = tokens.find(
              (token) => token.address === prize.address
            );
            const decimals = tokenDecimals[prize.address] || 18;
            return (
              <div
                key={symbol}
                className="flex justify-between items-center px-4"
              >
                {prize.type === "erc20" ? (
                  <div className="flex flex-row gap-1 items-center">
                    <span>{`${formatNumber(
                      Number(prize.value) / 10 ** decimals
                    )}`}</span>
                    {getTokenLogoUrl(chainId, prize.address) ? (
                      <img
                        src={getTokenLogoUrl(chainId, prize.address)}
                        className="w-6 h-6 rounded-full"
                      />
                    ) : (
                      <span className="text-brand-muted text-xs">
                        {token?.symbol}
                      </span>
                    )}
                  </div>
                ) : (
                  `${(prize.value as bigint[]).length} NFT${
                    (prize.value as bigint[]).length === 1 ? "" : "s"
                  }`
                )}
                {prize.type === "erc20" && hasPrice ? (
                  <span className="text-neutral">~${USDValue.toFixed(2)}</span>
                ) : (
                  <Tooltip delayDuration={50}>
                    <TooltipTrigger asChild>
                      <span className="w-6 h-6 text-neutral cursor-pointer">
                        <QUESTION />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent className="bg-black text-brand 3xl:text-lg">
                      <span className="text-neutral">
                        No Price Data Available
                      </span>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            );
          })}
      </div>
      {totalPrizesValueUSD > 0 && (
        <div className="flex flex-col gap-2">
          <div className="w-full bg-brand/50 h-0.5" />
          <div className="flex justify-between items-center px-4 pb-2">
            <span className="font-brand">Total</span>
            <span>${totalPrizesValueUSD.toFixed(2)}</span>
          </div>
        </div>
      )}
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
                    <span>{`$${totalPrizesValueUSD.toFixed(2)}`}</span>
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
              ) : Object.entries(prizes).length > 0 ? (
                <div className="flex flex-row items-center gap-2 font-brand xl:text-lg 3xl:text-2xl">
                  {Object.entries(prizes).map(([symbol, prize]) => {
                    const decimals = tokenDecimals[prize.address] || 18;
                    return (
                      <div
                        className="flex flex-row items-center gap-2"
                        key={symbol}
                      >
                        <span className="whitespace-nowrap">{`${formatNumber(
                          Number(prize.value) / 10 ** decimals
                        )}`}</span>
                        <div className="w-6 h-6">
                          <img
                            src={getTokenLogoUrl(chainId, prize.address)}
                            alt={`${symbol} token`}
                          />
                        </div>
                      </div>
                    );
                  })}
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
