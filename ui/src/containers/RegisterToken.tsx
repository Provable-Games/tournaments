import { useState, ChangeEvent, useEffect } from "react";
import { useAccount } from "@starknet-react/core";
import { Button } from "@/components/ui/button";
import { useSystemCalls } from "@/dojo/hooks/useSystemCalls";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";
import { copyToClipboard, padAddress, formatBalance } from "@/lib/utils";
import { useDojoSystem } from "@/dojo/hooks/useDojoSystem";
import { useDojo } from "@/context/dojo";
import { useSubscribeTokensQuery } from "@/dojo/hooks/useSdkQueries";
import TokenBox from "@/components/registerToken/TokenBox";
import TokenCard from "@/components/registerToken/TokenCard";
import { Token } from "@/generated/models.gen";
import { useNavigate } from "react-router-dom";
import { ARROW_LEFT, QUESTION } from "@/components/Icons";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getTokenLogoUrl } from "@/lib/tokensMeta";
import { indexAddress } from "@/lib/utils";
import { mainnetNFTs } from "@/lib/nfts";
import { useTokenUris } from "@/hooks/useTokenUris";

const RegisterToken = () => {
  const { address } = useAccount();
  const { namespace, selectedChainConfig } = useDojo();
  const navigate = useNavigate();
  const erc20_mock = useDojoSystem("erc20_mock").contractAddress ?? "0x0";
  const erc721_mock = useDojoSystem("erc721_mock").contractAddress ?? "0x0";
  const [tokenType, setTokenType] = useState<string | null>(null);
  const [_tokenAddress, setTokenAddress] = useState("");
  const [_tokenId, setTokenId] = useState("");
  const [tokenBalance, setTokenBalance] = useState<Record<string, bigint>>({});
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [tokenInfo, setTokenInfo] = useState<{
    name: string;
    symbol: string;
  } | null>(null);
  const [loadingTokenInfo, setLoadingTokenInfo] = useState(false);
  const isMainnet = selectedChainConfig?.chainId === "SN_MAIN";

  const state = useDojoStore((state) => state);
  const tokens = state.getEntitiesByModel(namespace, "Token");

  // For token preview image fetching
  const tokenUris = useTokenUris(_tokenAddress ? [_tokenAddress] : []);

  useSubscribeTokensQuery(namespace);

  const {
    mintErc20,
    mintErc721,
    getBalanceGeneral,
    registerToken,
    getTokenInfo,
  } = useSystemCalls();

  const handleChangeAddress = async (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setTokenAddress(value);

    // Reset token info when address changes
    setTokenInfo(null);

    // If address looks like a valid contract address, fetch token info
    if (value.length >= 60 && value.startsWith("0x")) {
      setLoadingTokenInfo(true);
      try {
        const info = await getTokenInfo(value);
        console.log(info);
        setTokenInfo(info);
      } catch (error) {
        console.error("Failed to fetch token info:", error);
        setTokenInfo(null);
      } finally {
        setLoadingTokenInfo(false);
      }
    }
  };

  const handleChangeTokenId = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setTokenId(value);
  };

  const getTestERC20Balance = async () => {
    const balance = await getBalanceGeneral(erc20_mock);
    if (balance !== undefined) {
      setTokenBalance((prev) => ({
        ...prev,
        erc20: balance as bigint,
      }));
    }
  };

  const getTestERC721Balance = async () => {
    const balance = await getBalanceGeneral(erc721_mock);
    if (balance !== undefined) {
      setTokenBalance((prev) => ({
        ...prev,
        erc721: balance as bigint,
      }));
    }
  };

  useEffect(() => {
    if (address) {
      getTestERC20Balance();
      getTestERC721Balance();
    }
  }, [address]);

  const handleCopyAddress = (address: string, standard: string) => {
    copyToClipboard(padAddress(address));
    setCopiedStates((prev) => ({ ...prev, [standard]: true }));
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [standard]: false }));
    }, 2000);
  };

  const handleRegisterToken = async () => {
    if (!tokenType || !_tokenAddress || !address) return;

    try {
      await registerToken(
        _tokenAddress,
        tokenType as "erc20" | "erc721",
        _tokenId
      );
      // Reset form after successful registration
      setTokenAddress("");
      setTokenId("");
      setTokenType(null);
    } catch (error) {
      console.error("Failed to register token:", error);
    }
  };

  const getTokenPreviewImage = () => {
    if (!_tokenAddress || !tokenType) return null;

    if (tokenType === "erc20") {
      return getTokenLogoUrl(selectedChainConfig?.chainId ?? "", _tokenAddress);
    } else {
      const whitelistedImage = mainnetNFTs.find(
        (nft) => indexAddress(nft.address) === indexAddress(_tokenAddress)
      )?.image;
      if (whitelistedImage) {
        return whitelistedImage;
      }
      return tokenUris[_tokenAddress]?.image ?? null;
    }
  };

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-80px)] w-3/4 mx-auto">
      <div className="space-y-5">
        <div className="flex flex-row justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ARROW_LEFT />
            Home
          </Button>
        </div>
        <div className="flex flex-row items-center h-12 justify-between">
          <div className="flex flex-row gap-5">
            <span className="font-brand text-4xl font-bold">
              Register Token
            </span>
          </div>
        </div>
        <Card variant="outline" className="h-auto w-full">
          <div className="flex flex-col lg:p-2 2xl:p-4 gap-2 sm:gap-5">
            <span className="font-brand text-lg sm:text-xl lg:text-2xl 2xl:text-3xl 3xl:text-4xl font-bold">
              Current Tokens
            </span>
            {!isMainnet ? (
              <div className="flex flex-row gap-2 justify-center">
                <TokenBox
                  title="Test ERC20"
                  contractAddress={erc20_mock}
                  standard="erc20"
                  balance={formatBalance(tokenBalance["erc20"])}
                  onMint={async () => {
                    await mintErc20(erc20_mock, address!, {
                      low: 100000000000000000000n,
                      high: 0n,
                    });
                  }}
                  onCopy={handleCopyAddress}
                  isCopied={copiedStates["erc20"]}
                  disabled={!address}
                />

                <TokenBox
                  title="Test ERC721"
                  contractAddress={erc721_mock}
                  standard="erc721"
                  balance={Number(tokenBalance["erc721"])}
                  onMint={async () => {
                    await mintErc721(erc721_mock, address!, {
                      low: BigInt(Number(tokenBalance["erc721"]) + 1),
                      high: 0n,
                    });
                  }}
                  onCopy={handleCopyAddress}
                  isCopied={copiedStates["erc721"]}
                  variant="erc721"
                  disabled={!address}
                />
              </div>
            ) : (
              <>
                {!!tokens && tokens.length > 0 ? (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-brand/50">
                    {tokens.map((token) => {
                      const tokenModel = token.models[namespace].Token as Token;
                      return (
                        <TokenCard key={token.entityId} token={tokenModel} />
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-2xl text-center uppercase text-terminal-green/75">
                    No tokens registered
                  </p>
                )}
              </>
            )}
            <div className="flex flex-row items-center gap-2">
              <span className="font-brand text-lg sm:text-xl lg:text-2xl 2xl:text-3xl 3xl:text-4xl font-bold">
                Register Token
              </span>
              <p>
                To register a token you must hold an amount of it. In the case
                of registering an NFT, you must also provide the token ID.
              </p>
            </div>
            <div className="flex flex-col gap-2 px-4">
              <div className="flex flex-row items-center gap-2">
                <div className="flex flex-col items-center gap-2">
                  <h3 className="text-sm uppercase">Select Token Type</h3>
                  <div className="flex flex-row gap-2">
                    <Button
                      variant={tokenType === "erc20" ? "default" : "outline"}
                      onClick={() => setTokenType("erc20")}
                    >
                      ERC20
                    </Button>
                    <Button
                      variant={tokenType === "erc721" ? "default" : "outline"}
                      onClick={() => setTokenType("erc721")}
                    >
                      ERC721
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center justify-between w-[700px]">
                    <h3 className="text-sm uppercase">Paste Contract Address</h3>
                    {/* Token Preview above input on the right */}
                    {(tokenInfo || loadingTokenInfo) && (
                      <div className="flex items-center gap-2">
                        {loadingTokenInfo ? (
                          <div className="w-5 h-5 border border-brand/20 border-t-brand rounded-full animate-spin" />
                        ) : (
                          <>
                            {getTokenPreviewImage() ? (
                              <img
                                src={getTokenPreviewImage()!}
                                className="w-6 h-6 rounded-full object-cover"
                                alt="Token logo"
                              />
                            ) : (
                              <div className="w-6 h-6 flex items-center justify-center">
                                <QUESTION />
                              </div>
                            )}
                            <span className="text-sm font-bold">
                              {tokenInfo?.symbol} • {tokenType?.toUpperCase()}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <Input
                    type="text"
                    name="tokenAddress"
                    onChange={handleChangeAddress}
                    className="p-3 h-12 w-[700px] text-sm"
                    placeholder="0x..."
                  />
                </div>
                {tokenType === "erc721" && (
                  <div className="flex flex-col items-center gap-2">
                    <h3 className="text-sm uppercase">Enter Token ID</h3>
                    <Input
                      type="number"
                      name="tokenId"
                      onChange={handleChangeTokenId}
                      className="p-1 m-2 h-12 w-20 2xl:text-2xl"
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={handleRegisterToken}
                  disabled={
                    _tokenAddress === "" ||
                    tokenType === null ||
                    (tokenType === "erc721" && _tokenId === "") ||
                    !address
                  }
                  className="w-1/2 h-14 text-lg font-bold uppercase flex items-center justify-center"
                >
                  REGISTER TOKEN
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterToken;
