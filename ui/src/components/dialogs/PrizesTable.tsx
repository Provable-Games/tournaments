import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TokenPrices } from "@/hooks/useEkuboPrices";
import { PositionPrizes } from "@/lib/types";
import { Token } from "@/generated/models.gen";
import { formatNumber, getOrdinalSuffix } from "@/lib/utils";
import { getTokenLogoUrl } from "@/lib/tokensMeta";
import { useDojo } from "@/context/dojo";
import { calculatePrizeValue } from "@/lib/utils/formatting";

interface PrizesTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupedPrizes: PositionPrizes;
  prices: TokenPrices;
  tokens: Token[];
  tokenDecimals: Record<string, number>;
}

export const PrizesTableDialog = ({
  open,
  onOpenChange,
  groupedPrizes,
  prices,
  tokens,
  tokenDecimals,
}: PrizesTableDialogProps) => {
  const { selectedChainConfig } = useDojo();
  const chainId = selectedChainConfig?.chainId ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Prize Distribution</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Position</TableHead>
                <TableHead>Prize</TableHead>
                <TableHead className="text-right">Value (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedPrizes)
                .sort(
                  (a, b) =>
                    Number(a[1].payout_position) -
                    Number(b[1].payout_position)
                )
                .map(([position, prizes]) => {
                  // Calculate total value for this position
                  let totalPositionValue = 0;
                  const prizeDetails = Object.entries(prizes).map(
                    ([symbol, prize]) => {
                      const value = calculatePrizeValue(prize, symbol, prices);
                      totalPositionValue += value;
                      return { symbol, prize, value };
                    }
                  );

                  return (
                    <TableRow key={position}>
                      <TableCell className="font-medium">
                        {position}
                        <sup>{getOrdinalSuffix(Number(position))}</sup>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {prizeDetails.map(({ symbol, prize }) => {
                            const token = tokens.find(
                              (token) => token.address === prize.address
                            );
                            const decimals = tokenDecimals[prize.address] || 18;
                            
                            return (
                              <div
                                key={`${position}-${symbol}`}
                                className="flex items-center gap-2"
                              >
                                {prize.type === "erc20" ? (
                                  <>
                                    <span>{`${formatNumber(
                                      Number(prize.value) / 10 ** decimals
                                    )}`}</span>
                                    {getTokenLogoUrl(chainId, prize.address) ? (
                                      <img
                                        src={getTokenLogoUrl(
                                          chainId,
                                          prize.address
                                        )}
                                        className="w-5 h-5 rounded-full"
                                        alt={symbol}
                                      />
                                    ) : (
                                      <span className="text-sm text-muted-foreground">
                                        {token?.symbol || symbol}
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span>{`${
                                    (prize.value as bigint[]).length
                                  } NFT${
                                    (prize.value as bigint[]).length === 1
                                      ? ""
                                      : "s"
                                  }`}</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {totalPositionValue > 0 ? (
                          <span>${totalPositionValue.toFixed(2)}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};