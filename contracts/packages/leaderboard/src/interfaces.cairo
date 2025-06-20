// SPDX-License-Identifier: BUSL-1.1

use starknet::ContractAddress;
use tournaments_leaderboard::models::leaderboard::{
    LeaderboardMetadata, LeaderboardEntry, LeaderboardResult,
};

/// Interface for the standalone Leaderboard contract
#[starknet::interface]
pub trait ILeaderboard<TState> {
    // CREATE operations
    fn create_leaderboard(
        ref self: TState,
        game_address: ContractAddress,
        name: ByteArray,
        description: ByteArray,
        max_entries: u8,
        ascending: bool,
    ) -> u64;

    // UPDATE operations
    fn submit_score(
        ref self: TState, leaderboard_id: u64, token_id: u64, score: u32, position: u8,
    ) -> LeaderboardResult;

    fn finalize_leaderboard(ref self: TState, leaderboard_id: u64);

    // READ operations
    fn get_leaderboard_metadata(self: @TState, leaderboard_id: u64) -> LeaderboardMetadata;
    fn get_leaderboard_entries(self: @TState, leaderboard_id: u64) -> Array<LeaderboardEntry>;
    fn get_entry_at_position(self: @TState, leaderboard_id: u64, position: u8) -> LeaderboardEntry;
    fn get_entry_position(self: @TState, leaderboard_id: u64, token_id: u64) -> Option<u8>;
    fn has_submitted(self: @TState, leaderboard_id: u64, token_id: u64) -> bool;
    fn is_finalized(self: @TState, leaderboard_id: u64) -> bool;
    fn get_leaderboard_size(self: @TState, leaderboard_id: u64) -> u8;

    // Utility operations
    fn qualifies_for_leaderboard(self: @TState, leaderboard_id: u64, score: u32) -> bool;
    fn get_minimum_qualifying_score(self: @TState, leaderboard_id: u64) -> Option<u32>;
}

/// Interface for leaderboard contract (same as ILeaderboard but with different name for
/// compatibility)
#[starknet::interface]
pub trait ILeaderboardContract<TState> {
    fn create_leaderboard(
        ref self: TState,
        game_address: ContractAddress,
        name: ByteArray,
        description: ByteArray,
        max_entries: u8,
        ascending: bool,
    ) -> u64;

    fn submit_score(
        ref self: TState, leaderboard_id: u64, token_id: u64, score: u32, position: u8,
    ) -> LeaderboardResult;

    fn finalize_leaderboard(ref self: TState, leaderboard_id: u64);
    fn get_leaderboard_entries(self: @TState, leaderboard_id: u64) -> Array<LeaderboardEntry>;
    fn get_entry_at_position(self: @TState, leaderboard_id: u64, position: u8) -> LeaderboardEntry;
    fn get_entry_position(self: @TState, leaderboard_id: u64, token_id: u64) -> Option<u8>;
    fn has_submitted(self: @TState, leaderboard_id: u64, token_id: u64) -> bool;
    fn qualifies_for_leaderboard(self: @TState, leaderboard_id: u64, score: u32) -> bool;
}
