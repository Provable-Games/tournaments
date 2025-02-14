import type { SchemaType as ISchemaType } from "@dojoengine/sdk";

import {
  CairoCustomEnum,
  CairoOption,
  CairoOptionVariant,
  BigNumberish,
  Uint256,
} from "starknet";

type WithFieldOrder<T> = T & { fieldOrder: string[] };

// Type definition for `tournaments::components::models::game::GameCount` struct
export interface GameCount {
  key: BigNumberish;
  count: BigNumberish;
}

// Type definition for `tournaments::components::models::game::GameCountValue` struct
export interface GameCountValue {
  count: BigNumberish;
}

// Type definition for `tournaments::components::models::game::GameMetadata` struct
export interface GameMetadata {
  address: string;
  name: BigNumberish;
  description: string;
  developer: BigNumberish;
  publisher: BigNumberish;
  genre: BigNumberish;
  image: string;
}

// Type definition for `tournaments::components::models::game::GameMetadataValue` struct
export interface GameMetadataValue {
  name: BigNumberish;
  description: string;
  developer: BigNumberish;
  publisher: BigNumberish;
  genre: BigNumberish;
  image: string;
}

// Type definition for `tournaments::components::models::game::Score` struct
export interface Score {
  game_id: BigNumberish;
  score: BigNumberish;
}

// Type definition for `tournaments::components::models::game::ScoreValue` struct
export interface ScoreValue {
  score: BigNumberish;
}

// Type definition for `tournaments::components::models::game::SettingsDetails` struct
export interface SettingsDetails {
  id: BigNumberish;
  name: BigNumberish;
  description: string;
  exists: boolean;
}

// Type definition for `tournaments::components::models::game::SettingsDetailsValue` struct
export interface SettingsDetailsValue {
  name: BigNumberish;
  description: string;
  exists: boolean;
}

// Type definition for `tournaments::components::models::game::TokenMetadata` struct
export interface TokenMetadata {
  token_id: BigNumberish;
  minted_by: string;
  player_name: BigNumberish;
  settings_id: BigNumberish;
  minted_at: BigNumberish;
  available_at: BigNumberish;
  expires_at: BigNumberish;
}

// Type definition for `tournaments::components::models::game::TokenMetadataValue` struct
export interface TokenMetadataValue {
  minted_by: string;
  player_name: BigNumberish;
  settings_id: BigNumberish;
  minted_at: BigNumberish;
  available_at: BigNumberish;
  expires_at: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::ERC20Data` struct
export interface ERC20Data {
  amount: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::ERC721Data` struct
export interface ERC721Data {
  id: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::EntryCount` struct
export interface EntryCount {
  tournament_id: BigNumberish;
  count: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::EntryCountValue` struct
export interface EntryCountValue {
  count: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::EntryFee` struct
export interface EntryFee {
  token_address: string;
  amount: BigNumberish;
  distribution: Array<BigNumberish>;
  tournament_creator_share: CairoOption<BigNumberish>;
  game_creator_share: CairoOption<BigNumberish>;
}

// Type definition for `tournaments::components::models::tournament::GameConfig` struct
export interface GameConfig {
  address: string;
  settings_id: BigNumberish;
  prize_spots: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::Leaderboard` struct
export interface Leaderboard {
  tournament_id: BigNumberish;
  token_ids: Array<BigNumberish>;
}

// Type definition for `tournaments::components::models::tournament::LeaderboardValue` struct
export interface LeaderboardValue {
  token_ids: Array<BigNumberish>;
}

// Type definition for `tournaments::components::models::tournament::Metadata` struct
export interface Metadata {
  name: BigNumberish;
  description: string;
}

// Type definition for `tournaments::components::models::tournament::Period` struct
export interface Period {
  start: BigNumberish;
  end: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::PlatformMetrics` struct
export interface PlatformMetrics {
  key: BigNumberish;
  total_tournaments: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::PlatformMetricsValue` struct
export interface PlatformMetricsValue {
  total_tournaments: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::Prize` struct
export interface Prize {
  id: BigNumberish;
  tournament_id: BigNumberish;
  payout_position: BigNumberish;
  token_address: string;
  token_type: TokenTypeEnum;
}

// Type definition for `tournaments::components::models::tournament::PrizeClaim` struct
export interface PrizeClaim {
  tournament_id: BigNumberish;
  prize_type: PrizeTypeEnum;
  claimed: boolean;
}

// Type definition for `tournaments::components::models::tournament::PrizeClaimValue` struct
export interface PrizeClaimValue {
  claimed: boolean;
}

// Type definition for `tournaments::components::models::tournament::PrizeMetrics` struct
export interface PrizeMetrics {
  key: BigNumberish;
  total_prizes: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::PrizeMetricsValue` struct
export interface PrizeMetricsValue {
  total_prizes: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::PrizeValue` struct
export interface PrizeValue {
  tournament_id: BigNumberish;
  payout_position: BigNumberish;
  token_address: string;
  token_type: TokenTypeEnum;
}

// Type definition for `tournaments::components::models::tournament::Registration` struct
export interface Registration {
  tournament_id: BigNumberish;
  game_token_id: BigNumberish;
  entry_number: BigNumberish;
  has_submitted: boolean;
}

// Type definition for `tournaments::components::models::tournament::RegistrationValue` struct
export interface RegistrationValue {
  entry_number: BigNumberish;
  has_submitted: boolean;
}

// Type definition for `tournaments::components::models::tournament::Schedule` struct
export interface Schedule {
  registration: CairoOption<Period>;
  game: Period;
  submission_duration: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::Token` struct
export interface Token {
  address: string;
  name: string;
  symbol: string;
  token_type: TokenTypeEnum;
  is_registered: boolean;
}

// Type definition for `tournaments::components::models::tournament::TokenValue` struct
export interface TokenValue {
  name: string;
  symbol: string;
  token_type: TokenTypeEnum;
  is_registered: boolean;
}

// Type definition for `tournaments::components::models::tournament::Tournament` struct
export interface Tournament {
  id: BigNumberish;
  creator: string;
  metadata: Metadata;
  schedule: Schedule;
  game_config: GameConfig;
  entry_fee: CairoOption<EntryFee>;
  entry_requirement: CairoOption<EntryRequirementEnum>;
}

// Type definition for `tournaments::components::models::tournament::TournamentConfig` struct
export interface TournamentConfig {
  key: BigNumberish;
  safe_mode: boolean;
  test_mode: boolean;
}

// Type definition for `tournaments::components::models::tournament::TournamentConfigValue` struct
export interface TournamentConfigValue {
  safe_mode: boolean;
  test_mode: boolean;
}

// Type definition for `tournaments::components::models::tournament::TournamentTokenMetrics` struct
export interface TournamentTokenMetrics {
  key: BigNumberish;
  total_supply: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::TournamentTokenMetricsValue` struct
export interface TournamentTokenMetricsValue {
  total_supply: BigNumberish;
}

// Type definition for `tournaments::components::models::tournament::TournamentValue` struct
export interface TournamentValue {
  creator: string;
  metadata: Metadata;
  schedule: Schedule;
  game_config: GameConfig;
  entry_fee: CairoOption<EntryFee>;
  entry_requirement: CairoOption<EntryRequirementEnum>;
}

// Type definition for `tournaments::components::models::tournament::EntryRequirement` enum
export type EntryRequirement = {
  token: string;
  tournament: TournamentType;
  allowlist: Array<string>;
};
export type EntryRequirementEnum = CairoCustomEnum;

// Type definition for `tournaments::components::models::tournament::PrizeType` enum
export type PrizeType = {
  EntryFees: Role;
  Sponsored: BigNumberish;
};
export type PrizeTypeEnum = CairoCustomEnum;

// Type definition for `tournaments::components::models::tournament::Role` enum
export enum Role {
  TournamentCreator,
  GameCreator,
  Position,
}

// Type definition for `tournaments::components::models::tournament::TokenType` enum
export type TokenType = {
  erc20: ERC20Data;
  erc721: ERC721Data;
};
export type TokenTypeEnum = CairoCustomEnum;

// Type definition for `tournaments::components::models::tournament::TournamentType` enum
export enum TournamentType {
  winners,
  participants,
}

// Type definition for `tournaments::components::models::tournament::QualidicationProof` struct
export type QualificationProof = {
  // For qualifying via previous tournament
  Tournament: TournamentQualification;
  // For qualifying via NFT ownership
  NFT: NFTQualification;
};

// Type definition for `tournaments::components::models::tournament::TournamentQualification` struct
export type TournamentQualification = {
  tournament_id: BigNumberish;
  token_id: BigNumberish;
  position: BigNumberish;
};

export type NFTQualification = {
  token_id: Uint256;
};

export interface SchemaType extends ISchemaType {
  tournaments: {
    GameCount: WithFieldOrder<GameCount>;
    GameCountValue: WithFieldOrder<GameCountValue>;
    GameMetadata: WithFieldOrder<GameMetadata>;
    GameMetadataValue: WithFieldOrder<GameMetadataValue>;
    Score: WithFieldOrder<Score>;
    ScoreValue: WithFieldOrder<ScoreValue>;
    SettingsDetails: WithFieldOrder<SettingsDetails>;
    SettingsDetailsValue: WithFieldOrder<SettingsDetailsValue>;
    TokenMetadata: WithFieldOrder<TokenMetadata>;
    TokenMetadataValue: WithFieldOrder<TokenMetadataValue>;
    ERC20Data: WithFieldOrder<ERC20Data>;
    ERC721Data: WithFieldOrder<ERC721Data>;
    EntryCount: WithFieldOrder<EntryCount>;
    EntryCountValue: WithFieldOrder<EntryCountValue>;
    EntryFee: WithFieldOrder<EntryFee>;
    GameConfig: WithFieldOrder<GameConfig>;
    Leaderboard: WithFieldOrder<Leaderboard>;
    LeaderboardValue: WithFieldOrder<LeaderboardValue>;
    Metadata: WithFieldOrder<Metadata>;
    Period: WithFieldOrder<Period>;
    PlatformMetrics: WithFieldOrder<PlatformMetrics>;
    PlatformMetricsValue: WithFieldOrder<PlatformMetricsValue>;
    Prize: WithFieldOrder<Prize>;
    PrizeClaim: WithFieldOrder<PrizeClaim>;
    PrizeClaimValue: WithFieldOrder<PrizeClaimValue>;
    PrizeMetrics: WithFieldOrder<PrizeMetrics>;
    PrizeMetricsValue: WithFieldOrder<PrizeMetricsValue>;
    PrizeValue: WithFieldOrder<PrizeValue>;
    Registration: WithFieldOrder<Registration>;
    RegistrationValue: WithFieldOrder<RegistrationValue>;
    Schedule: WithFieldOrder<Schedule>;
    Token: WithFieldOrder<Token>;
    TokenValue: WithFieldOrder<TokenValue>;
    Tournament: WithFieldOrder<Tournament>;
    TournamentConfig: WithFieldOrder<TournamentConfig>;
    TournamentConfigValue: WithFieldOrder<TournamentConfigValue>;
    TournamentTokenMetrics: WithFieldOrder<TournamentTokenMetrics>;
    TournamentTokenMetricsValue: WithFieldOrder<TournamentTokenMetricsValue>;
    TournamentValue: WithFieldOrder<TournamentValue>;
  };
}
export const schema: SchemaType = {
  tournaments: {
    GameCount: {
      fieldOrder: ["key", "count"],
      key: 0,
      count: 0,
    },
    GameCountValue: {
      fieldOrder: ["count"],
      count: 0,
    },
    GameMetadata: {
      fieldOrder: [
        "address",
        "name",
        "description",
        "developer",
        "publisher",
        "genre",
        "image",
      ],
      address: "",
      name: 0,
      description: "",
      developer: 0,
      publisher: 0,
      genre: 0,
      image: "",
    },
    GameMetadataValue: {
      fieldOrder: [
        "name",
        "description",
        "developer",
        "publisher",
        "genre",
        "image",
      ],
      name: 0,
      description: "",
      developer: 0,
      publisher: 0,
      genre: 0,
      image: "",
    },
    Score: {
      fieldOrder: ["game_id", "score"],
      game_id: 0,
      score: 0,
    },
    ScoreValue: {
      fieldOrder: ["score"],
      score: 0,
    },
    SettingsDetails: {
      fieldOrder: ["id", "name", "description", "exists"],
      id: 0,
      name: 0,
      description: "",
      exists: false,
    },
    SettingsDetailsValue: {
      fieldOrder: ["name", "description", "exists"],
      name: 0,
      description: "",
      exists: false,
    },
    TokenMetadata: {
      fieldOrder: [
        "token_id",
        "minted_by",
        "player_name",
        "settings_id",
        "minted_at",
        "available_at",
        "expires_at",
      ],
      token_id: 0,
      minted_by: "",
      player_name: 0,
      settings_id: 0,
      minted_at: 0,
      available_at: 0,
      expires_at: 0,
    },
    TokenMetadataValue: {
      fieldOrder: [
        "minted_by",
        "player_name",
        "settings_id",
        "minted_at",
        "available_at",
        "expires_at",
      ],
      minted_by: "",
      player_name: 0,
      settings_id: 0,
      minted_at: 0,
      available_at: 0,
      expires_at: 0,
    },
    ERC20Data: {
      fieldOrder: ["amount"],
      amount: 0,
    },
    ERC721Data: {
      fieldOrder: ["id"],
      id: 0,
    },
    EntryCount: {
      fieldOrder: ["tournament_id", "count"],
      tournament_id: 0,
      count: 0,
    },
    EntryCountValue: {
      fieldOrder: ["count"],
      count: 0,
    },
    EntryFee: {
      fieldOrder: [
        "token_address",
        "amount",
        "distribution",
        "tournament_creator_share",
        "game_creator_share",
      ],
      token_address: "",
      amount: 0,
      distribution: [0],
      tournament_creator_share: new CairoOption(CairoOptionVariant.None),
      game_creator_share: new CairoOption(CairoOptionVariant.None),
    },
    GameConfig: {
      fieldOrder: ["address", "settings_id", "prize_spots"],
      address: "",
      settings_id: 0,
      prize_spots: 0,
    },
    Leaderboard: {
      fieldOrder: ["tournament_id", "token_ids"],
      tournament_id: 0,
      token_ids: [0],
    },
    LeaderboardValue: {
      fieldOrder: ["token_ids"],
      token_ids: [0],
    },
    Metadata: {
      fieldOrder: ["name", "description"],
      name: 0,
      description: "",
    },
    Period: {
      fieldOrder: ["start", "end"],
      start: 0,
      end: 0,
    },
    PlatformMetrics: {
      fieldOrder: ["key", "total_tournaments"],
      key: 0,
      total_tournaments: 0,
    },
    PlatformMetricsValue: {
      fieldOrder: ["total_tournaments"],
      total_tournaments: 0,
    },
    Prize: {
      fieldOrder: [
        "id",
        "tournament_id",
        "payout_position",
        "token_address",
        "token_type",
      ],
      id: 0,
      tournament_id: 0,
      payout_position: 0,
      token_address: "",
      token_type: new CairoCustomEnum({
        erc20: { fieldOrder: ["amount"], amount: 0 },
        erc721: undefined,
      }),
    },
    PrizeClaim: {
      fieldOrder: ["tournament_id", "prize_type", "claimed"],
      tournament_id: 0,
      prize_type: new CairoCustomEnum({
        EntryFees: Role.TournamentCreator,
        sponsored: undefined,
      }),
      claimed: false,
    },
    PrizeClaimValue: {
      fieldOrder: ["claimed"],
      claimed: false,
    },
    PrizeMetrics: {
      fieldOrder: ["key", "total_prizes"],
      key: 0,
      total_prizes: 0,
    },
    PrizeMetricsValue: {
      fieldOrder: ["total_prizes"],
      total_prizes: 0,
    },
    PrizeValue: {
      fieldOrder: [
        "tournament_id",
        "payout_position",
        "token_address",
        "token_type",
      ],
      tournament_id: 0,
      payout_position: 0,
      token_address: "",
      token_type: new CairoCustomEnum({
        erc20: { fieldOrder: ["amount"], amount: 0 },
        erc721: undefined,
      }),
    },
    Registration: {
      fieldOrder: [
        "tournament_id",
        "game_token_id",
        "entry_number",
        "has_submitted",
      ],
      tournament_id: 0,
      game_token_id: 0,
      entry_number: 0,
      has_submitted: false,
    },
    RegistrationValue: {
      fieldOrder: ["entry_number", "has_submitted"],
      entry_number: 0,
      has_submitted: false,
    },
    Schedule: {
      fieldOrder: ["registration", "game", "submission_duration"],
      registration: new CairoOption(CairoOptionVariant.None),
      game: { start: 0, end: 0 },
      submission_duration: 0,
    },
    Token: {
      fieldOrder: ["address", "name", "symbol", "token_type", "is_registered"],
      address: "",
      name: "",
      symbol: "",
      token_type: new CairoCustomEnum({
        erc20: { fieldOrder: ["amount"], amount: 0 },
        erc721: undefined,
      }),
      is_registered: false,
    },
    TokenValue: {
      fieldOrder: ["name", "symbol", "token_type", "is_registered"],
      name: "",
      symbol: "",
      token_type: new CairoCustomEnum({
        erc20: { fieldOrder: ["amount"], amount: 0 },
        erc721: undefined,
      }),
      is_registered: false,
    },
    Tournament: {
      fieldOrder: [
        "id",
        "creator",
        "metadata",
        "schedule",
        "game_config",
        "entry_fee",
        "entry_requirement",
      ],
      id: 0,
      creator: "",
      metadata: { name: 0, description: "" },
      schedule: {
        registration: new CairoOption(CairoOptionVariant.None),
        game: { start: 0, end: 0 },
        submission_duration: 0,
      },
      game_config: { address: "", settings_id: 0, prize_spots: 0 },
      entry_fee: new CairoOption(CairoOptionVariant.None),
      entry_requirement: new CairoOption(CairoOptionVariant.None),
    },
    TournamentConfig: {
      fieldOrder: ["key", "safe_mode", "test_mode"],
      key: 0,
      safe_mode: false,
      test_mode: false,
    },
    TournamentConfigValue: {
      fieldOrder: ["safe_mode", "test_mode"],
      safe_mode: false,
      test_mode: false,
    },
    TournamentTokenMetrics: {
      fieldOrder: ["key", "total_supply"],
      key: 0,
      total_supply: 0,
    },
    TournamentTokenMetricsValue: {
      fieldOrder: ["total_supply"],
      total_supply: 0,
    },
    TournamentValue: {
      fieldOrder: [
        "creator",
        "metadata",
        "schedule",
        "game_config",
        "entry_fee",
        "entry_requirement",
      ],
      creator: "",
      metadata: {
        name: 0,
        description: "",
      },
      schedule: {
        registration: new CairoOption(CairoOptionVariant.None),
        game: { start: 0, end: 0 },
        submission_duration: 0,
      },
      game_config: {
        address: "",
        settings_id: 0,
        prize_spots: 0,
      },
      entry_fee: new CairoOption(CairoOptionVariant.None),
      entry_requirement: new CairoOption(CairoOptionVariant.None),
    },
  },
};
export enum ModelsMapping {
  GameCount = "tournaments-GameCount",
  GameCountValue = "tournaments-GameCountValue",
  GameMetadata = "tournaments-GameMetadata",
  GameMetadataValue = "tournaments-GameMetadataValue",
  Score = "tournaments-Score",
  ScoreValue = "tournaments-ScoreValue",
  SettingsDetails = "tournaments-SettingsDetails",
  SettingsDetailsValue = "tournaments-SettingsDetailsValue",
  TokenMetadata = "tournaments-TokenMetadata",
  TokenMetadataValue = "tournaments-TokenMetadataValue",
  ERC20Data = "tournaments-ERC20Data",
  ERC721Data = "tournaments-ERC721Data",
  EntryCount = "tournaments-EntryCount",
  EntryCountValue = "tournaments-EntryCountValue",
  EntryFee = "tournaments-EntryFee",
  EntryRequirement = "tournaments-EntryRequirement",
  GameConfig = "tournaments-GameConfig",
  Leaderboard = "tournaments-Leaderboard",
  LeaderboardValue = "tournaments-LeaderboardValue",
  Metadata = "tournaments-Metadata",
  Period = "tournaments-Period",
  PlatformMetrics = "tournaments-PlatformMetrics",
  PlatformMetricsValue = "tournaments-PlatformMetricsValue",
  Prize = "tournaments-Prize",
  PrizeClaim = "tournaments-PrizeClaim",
  PrizeClaimValue = "tournaments-PrizeClaimValue",
  PrizeMetrics = "tournaments-PrizeMetrics",
  PrizeMetricsValue = "tournaments-PrizeMetricsValue",
  PrizeType = "tournaments-PrizeType",
  PrizeValue = "tournaments-PrizeValue",
  Registration = "tournaments-Registration",
  RegistrationValue = "tournaments-RegistrationValue",
  Role = "tournaments-Role",
  Schedule = "tournaments-Schedule",
  Token = "tournaments-Token",
  TokenType = "tournaments-TokenType",
  TokenValue = "tournaments-TokenValue",
  Tournament = "tournaments-Tournament",
  TournamentConfig = "tournaments-TournamentConfig",
  TournamentConfigValue = "tournaments-TournamentConfigValue",
  TournamentTokenMetrics = "tournaments-TournamentTokenMetrics",
  TournamentTokenMetricsValue = "tournaments-TournamentTokenMetricsValue",
  TournamentType = "tournaments-TournamentType",
  TournamentValue = "tournaments-TournamentValue",
}
