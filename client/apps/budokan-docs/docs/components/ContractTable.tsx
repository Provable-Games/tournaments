import { getAddress } from "../../utils/addresses";
import { ContractLink } from "./ContractLink";

// docs/components/ContractTable.tsx
interface Contract {
  name: string;
  namespace: string;
  chainId: string;
}

interface ContractTableProps {
  contracts: Contract[][];
}

export function ContractTable({ contracts }: ContractTableProps) {
  return (
    <table className="min-w-full divide-y divide-gray-200 border border-gray-200 w-full">
      <thead>
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
            Contract/Network
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
            Sepolia
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
            Mainnet
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-200">
        {contracts.map((contractPair, index) => {
          const [sepoliaContract, mainnetContract] = contractPair;
          return (
            <tr key={index}>
              <td className="px-6 py-4 text-sm font-medium">
                {mainnetContract.name}
              </td>
              <td className="px-6 py-4 text-sm w-[100px]">
                <ContractLink
                  address={
                    getAddress(
                      sepoliaContract.namespace,
                      sepoliaContract.name,
                      "sepolia"
                    ) ?? ""
                  }
                  network="sepolia"
                />
              </td>
              <td className="px-6 py-4 text-sm">
                <ContractLink
                  address={
                    getAddress(
                      mainnetContract.namespace,
                      mainnetContract.name,
                      "mainnet"
                    ) ?? ""
                  }
                  network="mainnet"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
