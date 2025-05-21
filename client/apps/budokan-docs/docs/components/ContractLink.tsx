import { displayAddress } from "../../utils/addresses";

// components/ContractLink.tsx
interface ContractLinkProps {
  address: string;
  label?: string;
  network?: string;
}

export function ContractLink({ address, label, network }: ContractLinkProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-(--color-brand)">{label || displayAddress(address)}</p>
      <div className="flex flex-row gap-2">
        <a
          href={`https://${
            network === "mainnet" ? "starkscan.co" : "sepolia.starkscan.co"
          }/contract/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-(--color-brand) hover:text-(--color-brand) hover:underline font-mono text-xs"
        >
          Starkscan
        </a>
        <a
          href={`https://${
            network === "mainnet" ? "voyager.online" : "sepolia.voyager.online"
          }/contract/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-(--color-brand) hover:text-(--color-brand) hover:underline font-mono text-xs"
        >
          Voyager
        </a>
      </div>
    </div>
  );
}
