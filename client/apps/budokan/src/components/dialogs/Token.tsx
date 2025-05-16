import { useMemo, useState } from "react";
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
import { getTokenLogoUrl, getTokenHidden } from "@/lib/tokensMeta";
import { useDojo } from "@/context/dojo";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { Token } from "@/generated/models.gen";
import { ChainId } from "@/dojo/setup/networks";
import { QUESTION } from "@/components/Icons";
import { sepoliaTokens } from "@/lib/sepoliaTokens";
import { addAddressPadding, CairoCustomEnum } from "starknet";
import { bigintToHex, indexAddress } from "@/lib/utils";
import { useTokenUris } from "@/hooks/useTokenUris";
import { FormToken } from "@/lib/types";
import { mainnetNFTs } from "@/lib/nfts";

interface TokenDialogProps {
  selectedToken: FormToken | undefined;
  onSelect: (token: FormToken) => void;
  type?: "erc20" | "erc721";
}

const TokenDialog = ({ selectedToken, onSelect, type }: TokenDialogProps) => {
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");
  const { selectedChainConfig, namespace } = useDojo();

  const isMainnet = selectedChainConfig.chainId === ChainId.SN_MAIN;
  const isSepolia = selectedChainConfig.chainId === ChainId.SN_SEPOLIA;

  const mainnetTokens = useDojoStore((state) =>
    state
      .getEntitiesByModel(namespace, "Token")
      .map((token) => token.models[namespace].Token as Token)
  );

  const tokens: Token[] = useMemo(() => {
    return isMainnet
      ? mainnetTokens
      : isSepolia
      ? sepoliaTokens.map((token) => ({
          address: token.l2_token_address,
          name: token.name,
          symbol: token.symbol,
          is_registered: true,
          token_type: new CairoCustomEnum({
            erc20: {
              amount: addAddressPadding(bigintToHex(BigInt(1))),
            },
          }),
        }))
      : [];
  }, [isMainnet, isSepolia, namespace]);

  const typeFilteredTokens = type
    ? tokens.filter((token) => token.token_type.activeVariant() === type)
    : tokens;

  const searchFilteredTokens = typeFilteredTokens.filter((token) =>
    token.name.toLowerCase().includes(tokenSearchQuery.toLowerCase())
  );

  const erc721Tokens = searchFilteredTokens.filter(
    (token) => token.token_type.activeVariant() === "erc721"
  );

  const whitelistedNFTTokens = mainnetNFTs.filter((nft) =>
    erc721Tokens.some(
      (token) => indexAddress(nft.address) === indexAddress(token.address)
    )
  );

  const tokenUris = useTokenUris(erc721Tokens.map((token) => token.address));

  const getTokenImage = (token: Token) => {
    if (token.token_type.activeVariant() === "erc20") {
      return getTokenLogoUrl(selectedChainConfig?.chainId ?? "", token.address);
    } else {
      const whitelistedImage = whitelistedNFTTokens.find(
        (nft) => indexAddress(nft.address) === indexAddress(token.address)
      )?.image;
      if (whitelistedImage) {
        return whitelistedImage;
      }
      return tokenUris[token.address]?.image ?? null;
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" type="button" className="h-14 max-w-[200px]">
          {selectedToken ? (
            <div className="flex items-center gap-2">
              <img
                src={selectedToken.image ?? undefined}
                className="w-6 h-6 rounded-full"
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
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="p-4">Select Token</DialogTitle>
          <div className="px-4">
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
        {searchFilteredTokens.length > 0 ? (
          <div className="flex-1 overflow-y-auto">
            {searchFilteredTokens.map((token, index) => {
              const tokenLogo = getTokenImage(token);
              const isHidden = getTokenHidden(
                selectedChainConfig?.chainId ?? "",
                token.address
              );
              return (
                <DialogClose asChild key={index}>
                  <div
                    className={`w-full flex flex-row items-center justify-between hover:bg-brand/20 hover:cursor-pointer px-5 py-2 ${
                      selectedToken?.address === token.address
                        ? "bg-terminal-green/75 text-terminal-black"
                        : ""
                    } ${isHidden ? "hidden" : ""}`}
                    onClick={() =>
                      onSelect({
                        ...token,
                        image: getTokenImage(token) ?? undefined,
                      })
                    }
                  >
                    <div className="flex flex-row gap-5 items-center">
                      {tokenLogo ? (
                        <img src={tokenLogo} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 ">
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
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="flex flex-col items-center h-full">
              <span className="text-neutral">
                No <span className="uppercase">{type && type}</span> tokens
                found
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TokenDialog;
