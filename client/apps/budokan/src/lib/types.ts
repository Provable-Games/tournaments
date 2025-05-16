import { Token } from "@/generated/models.gen";

export interface TableData {
  id: number;
  name: string;
  email: string;
}

export type TokenPrizes = Record<
  string,
  {
    type: "erc20" | "erc721";
    address: string;
    value: bigint[] | bigint;
  }
>;

export type PositionPrizes = Record<
  string,
  Record<
    string,
    {
      type: "erc20" | "erc721";
      payout_position: string;
      address: string;
      value: bigint[] | bigint;
    }
  >
>;

export interface NewPrize {
  tokenAddress: string;
  tokenType: "ERC20" | "ERC721" | "";
  amount?: number;
  value?: number;
  tokenId?: number;
  position?: number;
  hasPrice?: boolean;
}

export type TokenUri = {
  name: string;
  description: string;
  attributes: {
    trait_type: string;
    value: string;
  }[];
  image: string;
};

export type FormToken = Token & {
  image?: string;
};
