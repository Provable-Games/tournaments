// components/ContractLink.tsx
interface ContractLinkProps {
  address: string;
  label?: string;
  network?: string;
}

export function ContractLink({ address, label, network }: ContractLinkProps) {
  return (
    <div className="flex flex-row gap-2">
      <a
        href={`https://${
          network === "mainnet" ? "starkscan.co" : "sepolia.starkscan.co"
        }/contract/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-(--color-brand) hover:text-(--color-brand) hover:underline font-mono text-wrap"
      >
        {label || address}
      </a>
      <a
        href={`https://${
          network === "mainnet" ? "starkscan.co" : "sepolia.starkscan.co"
        }/contract/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-(--color-brand) hover:text-(--color-brand) hover:underline font-mono text-wrap"
      >
        Starkscan
      </a>
      <a
        href={`https://${
          network === "mainnet" ? "voyager.online" : "sepolia.voyager.online"
        }/contract/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-(--color-brand) hover:text-(--color-brand) hover:underline font-mono text-wrap"
      >
        Voyager
      </a>
    </div>
  );
}
