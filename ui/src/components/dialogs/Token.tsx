import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { getTokenLogoUrl } from "@/lib/tokensMeta";
import { useDojo } from "@/context/dojo";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { Token } from "@/generated/models.gen";
import { ChainId } from "@/dojo/config";
import { addAddressPadding, CairoCustomEnum } from "starknet";
import { bigintToHex } from "@/lib/utils";
import { QUESTION } from "@/components/Icons";

interface TokenDialogProps {
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  type?: "erc20" | "erc721";
}

const TokenDialog = ({ selectedToken, onSelect, type }: TokenDialogProps) => {
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");
  const { selectedChainConfig, nameSpace } = useDojo();

  const isSepolia = selectedChainConfig.chainId === ChainId.SN_SEPOLIA;

  const sepoliaTokens = [
    {
      address:
        "0x064fd80fcb41d00214430574a0aa19d21cc5d6452aeb4996f31b6e9ba4f466a0",
      is_registered: true,
      name: "Lords",
      symbol: "LORDS",
      token_type: new CairoCustomEnum({
        erc20: {
          amount: addAddressPadding(bigintToHex(BigInt(1))),
        },
      }),
    },
  ];

  const tokens = isSepolia
    ? sepoliaTokens
    : useDojoStore((state) => state.getEntitiesByModel(nameSpace, "Token")).map(
        (token) => token.models[nameSpace].Token as Token
      );

  const typeFilteredTokens = type
    ? tokens.filter((token) => token.token_type.activeVariant() === type)
    : tokens;

  const searchFilteredTokens = typeFilteredTokens.filter((token) =>
    token.name.toLowerCase().includes(tokenSearchQuery.toLowerCase())
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" className="h-14 max-w-[200px]">
          {selectedToken ? (
            <div className="flex items-center gap-2">
              <img
                src={getTokenLogoUrl(selectedToken.address)}
                className="w-6 h-6"
                alt="Token logo"
              />
              <span className="text-sm text-neutral uppercase">
                {selectedToken.symbol}
              </span>
            </div>
          ) : (
            "Select Token"
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="h-[600px] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="p-4">Select Token</DialogTitle>
          <div className="px-4 pb-4">
            <div className="flex items-center border rounded border-brand-muted bg-background">
              <Search className="w-4 h-4 ml-3 text-muted-foreground" />
              <Input
                placeholder="Search tokens..."
                value={tokenSearchQuery}
                onChange={(e) => setTokenSearchQuery(e.target.value)}
                className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          {searchFilteredTokens.map((token, index) => {
            const tokenLogo = getTokenLogoUrl(token.address);
            return (
              <DialogClose asChild key={index}>
                <div
                  className={`w-full flex flex-row items-center justify-between hover:bg-brand/20 hover:cursor-pointer px-5 py-2 ${
                    selectedToken?.address === token.address
                      ? "bg-terminal-green/75 text-terminal-black"
                      : ""
                  }`}
                  onClick={() => onSelect(token)}
                >
                  <div className="flex flex-row gap-5 items-center">
                    {tokenLogo ? (
                      <img src={tokenLogo} className="w-8 h-8" />
                    ) : (
                      <div className="w-10 h-10 ">
                        <QUESTION />
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-bold">{token.name}</span>
                      <span className="uppercase text-neutral">
                        {token.symbol}
                      </span>
                    </div>
                  </div>
                  <span className="uppercase text-neutral">
                    {token.token_type.activeVariant()}
                  </span>
                </div>
              </DialogClose>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TokenDialog;
