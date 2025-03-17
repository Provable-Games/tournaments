import { useState } from "react";
import { Button } from "@/components/ui/button";
import { displayAddress } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
interface TokenBoxProps {
  title: string;
  contractAddress: string;
  standard: string;
  balance: number;
  onMint: () => Promise<void>;
  onCopy: (address: string, standard: string) => void;
  isCopied: boolean;
  variant?: "erc20" | "erc721";
  disabled?: boolean;
}

const TokenBox = ({
  title,
  contractAddress,
  standard,
  balance,
  onMint,
  onCopy,
  isCopied,
  variant,
  disabled,
}: TokenBoxProps) => {
  const [tokenId, setTokenId] = useState(0);
  return (
    <Card
      variant="outline"
      className="flex flex-col gap-2 items-center justify-center border border-brand p-2"
    >
      <p className="text-lg">{title}</p>
      <div className="relative flex flex-row items-center gap-2">
        <p className="text-lg">{displayAddress(contractAddress)}</p>
        {isCopied && (
          <span className="absolute top-[-20px] right-0 uppercase">
            Copied!
          </span>
        )}
        <Button size="xs" onClick={() => onCopy(contractAddress, standard)}>
          Copy
        </Button>
      </div>
      <p className="text-lg">Balance: {balance}</p>
      <div className="flex flex-row gap-2">
        {variant === "erc721" && (
          <Input
            type="number"
            value={tokenId}
            className="text-lg p-1 w-16 h-10"
            onChange={(e) => setTokenId(parseInt(e.target.value))}
            min={0}
          />
        )}
        <Button
          disabled={disabled}
          onClick={async () => {
            onMint();
          }}
        >
          Mint
        </Button>
      </div>
    </Card>
  );
};

export default TokenBox;
