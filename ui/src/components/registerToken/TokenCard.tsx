import { Card } from "@/components/ui/card";
import { getTokenLogoUrl, getTokenHidden } from "@/lib/tokensMeta";
import { useDojo } from "@/context/dojo";
import { indexAddress } from "@/lib/utils";
import { mainnetNFTs } from "@/lib/nfts";
import { useTokenUris } from "@/hooks/useTokenUris";
import { Token } from "@/generated/models.gen";
import { QUESTION } from "@/components/Icons";

interface TokenCardProps {
  token: Token;
}

const TokenCard = ({ token }: TokenCardProps) => {
  const { selectedChainConfig } = useDojo();
  
  const tokenUris = useTokenUris([token.address]);
  
  const getTokenImage = (token: Token) => {
    if (token.token_type === "erc20") {
      return getTokenLogoUrl(selectedChainConfig?.chainId ?? "", token.address);
    } else {
      const whitelistedImage = mainnetNFTs.find(
        (nft) => indexAddress(nft.address) === indexAddress(token.address)
      )?.image;
      if (whitelistedImage) {
        return whitelistedImage;
      }
      return tokenUris[token.address]?.image ?? null;
    }
  };

  const tokenImage = getTokenImage(token);
  const isHidden = getTokenHidden(
    selectedChainConfig?.chainId ?? "",
    token.address
  );

  if (isHidden) {
    return null;
  }

  return (
    <Card className="flex flex-col items-center justify-center p-2 w-20 h-20 flex-shrink-0">
      {tokenImage ? (
        <img 
          src={tokenImage} 
          className="w-8 h-8 rounded-full object-cover" 
          alt={`${token.name} logo`}
          title={`${token.name} (${token.token_type})`}
        />
      ) : (
        <div className="w-8 h-8 flex items-center justify-center" title={`${token.name} (${token.token_type})`}>
          <QUESTION />
        </div>
      )}
      
      <span className="text-xs font-bold mt-1 text-center leading-tight" title={`${token.name} (${token.symbol})`}>
        {token.symbol}
      </span>
    </Card>
  );
};

export default TokenCard;