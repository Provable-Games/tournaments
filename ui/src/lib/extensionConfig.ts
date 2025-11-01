import { indexAddress } from "@/lib/utils";

/**
 * Extension Configuration
 *
 * Maps extension contract addresses to their proof requirements.
 * Each extension can specify what data should be passed as qualification proof.
 */

export type ExtensionProofType = "address" | "custom";

export interface ExtensionConfig {
  name: string;
  description: string;
  proofType: ExtensionProofType;
  // Function to extract proof data - receives address and any additional context
  extractProof: (address: string, context?: any) => string[];
}

// Extension configurations by contract address
const extensionConfigs: Record<string, ExtensionConfig> = {
  // Example: Basic address-only extension
  // "0x...": {
  //   name: "Address Validator",
  //   description: "Validates entry based on address",
  //   proofType: "address",
  //   extractProof: (address: string) => [address],
  // },
  // Add more extension configs here as needed
  // Each extension address should map to its specific configuration
};

/**
 * Get extension configuration by contract address
 */
export const getExtensionConfig = (
  extensionAddress: string
): ExtensionConfig | null => {
  const normalizedAddress = indexAddress(extensionAddress);
  return extensionConfigs[normalizedAddress] || null;
};

/**
 * Get proof data for an extension
 * Falls back to default (address only) if no specific config exists
 */
export const getExtensionProof = (
  extensionAddress: string,
  playerAddress: string,
  context?: any
): string[] => {
  const config = getExtensionConfig(extensionAddress);

  if (config) {
    return config.extractProof(playerAddress, context);
  }

  // Default: just pass empty array
  return [];
};

/**
 * Register a new extension configuration
 * Useful for dynamically adding extension configs at runtime
 */
export const registerExtensionConfig = (
  extensionAddress: string,
  config: ExtensionConfig
): void => {
  const normalizedAddress = indexAddress(extensionAddress);
  extensionConfigs[normalizedAddress] = config;
};

/**
 * Check if an extension has a registered configuration
 */
export const hasExtensionConfig = (extensionAddress: string): boolean => {
  const normalizedAddress = indexAddress(extensionAddress);
  return normalizedAddress in extensionConfigs;
};

export default extensionConfigs;
