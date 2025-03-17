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
import { Token } from "@/generated/models.gen";
import { displayAddress } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { ARROW_LEFT } from "@/components/Icons";
import { Card } from "@/components/ui/card";

const RegisterToken = () => {
  const { address } = useAccount();
  const { nameSpace, selectedChainConfig } = useDojo();
  const navigate = useNavigate();
  const erc20_mock = useDojoSystem("erc20_mock").contractAddress ?? "0x0";
  const erc721_mock = useDojoSystem("erc721_mock").contractAddress ?? "0x0";
  const [tokenType, setTokenType] = useState<string | null>(null);
  const [_tokenAddress, setTokenAddress] = useState("");
  const [_tokenId, setTokenId] = useState("");
  const [tokenBalance, setTokenBalance] = useState<Record<string, bigint>>({});
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const isMainnet = selectedChainConfig?.chainId === "SN_MAIN";

  const state = useDojoStore((state) => state);
  const tokens = state.getEntitiesByModel(nameSpace, "Token");

  useSubscribeTokensQuery();

  const { mintErc20, mintErc721, getBalanceGeneral } = useSystemCalls();

  const handleChangeAddress = (e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setTokenAddress(value);
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
                  <div className="flex flex-row gap-2 justify-center">
                    {tokens.map((token) => {
                      const tokenModel = token.models[nameSpace].Token as Token;
                      return (
                        <Button
                          key={token.entityId}
                          variant="outline"
                          className="relative"
                        >
                          {tokenModel?.name}
                          <span className="absolute top-0 text-xs uppercase text-terminal-green/75">
                            {tokenModel?.token_type?.activeVariant()}
                          </span>
                          <span className="absolute bottom-0 text-xs uppercase text-terminal-green/75">
                            {displayAddress(tokenModel?.address!)}
                          </span>
                        </Button>
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
            <span className="font-brand text-lg sm:text-xl lg:text-2xl 2xl:text-3xl 3xl:text-4xl font-bold">
              Register Token
            </span>
            <p className="text-lg text-center">
              To register a token you must hold an amount of it. In the case of
              registering an NFT, you must also provide the token ID.
            </p>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-col items-center gap-2">
                  <h3 className="text-xl uppercase">Select Token Type</h3>
                  <div className="flex flex-row gap-10">
                    <Button
                      variant={tokenType === "erc20" ? "default" : "outline"}
                      onClick={() => setTokenType("erc20")}
                    >
                      ERC20
                    </Button>
                    <Button
                      variant={tokenType === "erc721" ? "default" : "outline"}
                      onClick={() => setTokenType("erc721")}
                    ></Button>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <h3 className="text-xl uppercase">Paste Contract Address</h3>
                  <input
                    type="text"
                    name="tokenAddress"
                    onChange={handleChangeAddress}
                    className="p-1 m-2 h-12 w-[700px] 2xl:text-2xl bg-terminal-black border border-terminal-green animate-pulse transform"
                  />
                </div>
                {tokenType === "erc721" && (
                  <div className="flex flex-col items-center gap-2">
                    <h3 className="text-xl">Enter Token ID</h3>
                    <input
                      type="number"
                      name="tokenId"
                      onChange={handleChangeTokenId}
                      className="p-1 m-2 h-12 w-20 2xl:text-2xl bg-terminal-black border border-terminal-green transform"
                    />
                  </div>
                )}
                {/* <Button
            onClick={handleRegisterToken}
            disabled={
              tokenAddress == "" ||
              tokenType === null ||
              (tokenType === TokenDataEnum.erc721 ? tokenId === "" : false)
            }
          >
            Register Token
          </Button> */}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterToken;
