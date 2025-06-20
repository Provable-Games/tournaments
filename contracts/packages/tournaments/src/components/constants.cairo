pub const TWO_POW_128: u128 = 100000000000000000000000000000000;

// used for fixed key lookups
pub const VERSION: felt252 = '0.0.1';

// Scheduling Bounds
pub const MIN_REGISTRATION_PERIOD: u32 = 900; // 15 minutes
pub const MAX_REGISTRATION_PERIOD: u32 = 2592000; // 1 month
pub const MIN_TOURNAMENT_LENGTH: u32 = 900; // 15 minutes
pub const MAX_TOURNAMENT_LENGTH: u32 = 31104000; // 1 year
pub const MIN_SUBMISSION_PERIOD: u32 = 900; // 15 minutes
pub const MAX_SUBMISSION_PERIOD: u32 = 604800; // 1 week

pub const MAINNET_CHAIN_ID: felt252 = 0x534e5f4d41494e;
pub const SEPOLIA_CHAIN_ID: felt252 = 0x534e5f5345504f4c4941;

pub const GAME_CREATOR_TOKEN_ID: u64 = 0;

pub fn DEFAULT_NS() -> ByteArray {
    "budokan_1_0_7"
}
