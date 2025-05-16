import { Connector } from "@starknet-react/core";
import { ControllerConnector } from "@cartridge/connector";
import { stringToFelt } from "@/lib/utils";
import { DojoManifest } from "../hooks/useDojoSystem";
import { SessionPolicies } from "@cartridge/presets";

const exclusions = ["dojo_init", "upgrade"];

const toTitleCase = (str: string): string => {
  return str
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const _makeControllerPolicies = (manifest: DojoManifest): SessionPolicies => {
  const policies: SessionPolicies = { contracts: {} };
  // contracts
  manifest?.contracts?.forEach((contract: any) => {
    if (!policies.contracts) policies.contracts = {};
    policies.contracts[contract.address] = {
      methods: contract.systems
        .filter((system: string) => !exclusions.includes(system))
        .map((system: string) => ({
          name: toTitleCase(system), // You'll need to implement toTitleCase
          entrypoint: system,
          description: `${contract.tag}::${system}()`,
        })),
    };
  });

  return policies;
};

export const initializeController = (
  chainRpcUrls: { rpcUrl: string }[],
  defaultChainId: string,
  manifest: DojoManifest,
  namespace: string
): Connector => {
  const policies = _makeControllerPolicies(manifest);
  return new ControllerConnector({
    chains: chainRpcUrls,
    defaultChainId: stringToFelt(defaultChainId).toString(),
    preset: "budokan",
    slot: "budokan-sepolia-achievements",
    tokens: {
      erc20: [
        "0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49",
        "0x0264be95a4a2ace20add68cb321acdccd2f9f8440ee1c7abd85da44ddab01085",
      ],
    },
    policies,
    namespace: "budokan_1_0_7",
  }) as never as Connector;
};
