// SPDX-License-Identifier: BUSL-1.1

use starknet::ContractAddress;

/// Leaderboard model for storing leaderboard metadata
#[derive(Clone, Drop, Serde, PartialEq, Introspect)]
#[dojo::model]
pub struct LeaderboardMetadata {
    #[key]
    pub id: u64,
    pub game_address: ContractAddress,
    pub name: ByteArray,
    pub description: ByteArray,
    pub creator: ContractAddress,
    pub max_entries: u8,
    pub ascending: bool, // true if lower scores are better
    pub is_finalized: bool,
    pub created_at: u64,
}

/// Entry in a leaderboard
#[derive(Clone, Drop, Serde, PartialEq, Introspect)]
#[dojo::model]
pub struct LeaderboardEntry {
    #[key]
    pub leaderboard_id: u64,
    #[key]
    pub position: u8, // 1-based position
    pub token_id: u64,
    pub score: u32,
    pub submitted_at: u64,
    pub submitted_by: ContractAddress,
}

/// Model to track if a token has submitted to a leaderboard
#[derive(Clone, Drop, Serde, PartialEq, Introspect)]
#[dojo::model]
pub struct LeaderboardSubmission {
    #[key]
    pub leaderboard_id: u64,
    #[key]
    pub token_id: u64,
    pub has_submitted: bool,
    pub position: u8,
}

/// Model to store the count of entries in a leaderboard
#[derive(Clone, Drop, Serde, PartialEq, Introspect)]
#[dojo::model]
pub struct LeaderboardEntryCount {
    #[key]
    pub leaderboard_id: u64,
    pub count: u8,
}

/// Model to track total number of leaderboards
#[derive(Clone, Drop, Serde, PartialEq, Introspect)]
#[dojo::model]
pub struct LeaderboardCounter {
    #[key]
    pub id: felt252, // Always 'LEADERBOARD_COUNTER'
    pub count: u64,
}

/// Result type for leaderboard operations
#[derive(Drop, Serde, Copy)]
pub enum LeaderboardResult {
    Success: (),
    InvalidPosition: (),
    LeaderboardFull: (),
    ScoreTooLow: (),
    ScoreTooHigh: (),
    DuplicateEntry: (),
    InvalidLeaderboard: (),
    Unauthorized: (),
    LeaderboardFinalized: (),
}
