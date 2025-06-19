// SPDX-License-Identifier: BUSL-1.1

/// Pure Cairo library for leaderboard management
/// This library provides core leaderboard functionality without storage dependencies
pub mod leaderboard {
    /// Configuration for leaderboard behavior
    #[derive(Drop, Serde, Copy)]
    pub struct LeaderboardConfig {
        /// Maximum number of entries allowed
        pub max_entries: u8,
        /// Whether lower scores are better (true) or higher scores are better (false)
        pub ascending: bool,
        /// Whether to allow ties (same score, different entries)
        pub allow_ties: bool,
    }

    /// Entry in the leaderboard
    #[derive(Drop, Serde, Copy)]
    pub struct LeaderboardEntry {
        /// Unique identifier for the entry
        pub id: u64,
        /// Score value
        pub score: u32,
    }

    /// Result of a leaderboard operation
    #[derive(Drop, Serde, Copy)]
    pub enum LeaderboardResult {
        Success: (),
        InvalidPosition: (),
        LeaderboardFull: (),
        ScoreTooLow: (),
        ScoreTooHigh: (),
        DuplicateEntry: (),
        InvalidConfig: (),
    }

    /// Trait for score comparison
    pub trait ScoreComparator {
        /// Compare two scores and return true if first is better than second
        fn is_better_score(self: @LeaderboardConfig, first: u32, second: u32) -> bool;
        /// Compare two scores and return true if they are equal
        fn is_equal_score(self: @LeaderboardConfig, first: u32, second: u32) -> bool;
        /// Handle tie-breaking between two entries with same score
        fn break_tie(
            self: @LeaderboardConfig, first: @LeaderboardEntry, second: @LeaderboardEntry,
        ) -> bool;
    }

    /// Implementation of ScoreComparator
    pub impl ScoreComparatorImpl of ScoreComparator {
        fn is_better_score(self: @LeaderboardConfig, first: u32, second: u32) -> bool {
            if *self.ascending {
                first < second
            } else {
                first > second
            }
        }

        fn is_equal_score(self: @LeaderboardConfig, first: u32, second: u32) -> bool {
            first == second
        }

        fn break_tie(
            self: @LeaderboardConfig, first: @LeaderboardEntry, second: @LeaderboardEntry,
        ) -> bool {
            // In case of tie, lower ID wins (first come, first served)
            *first.id < *second.id
        }
    }

    /// Core leaderboard operations
    pub trait LeaderboardOperations {
        /// Find the position where a new entry should be inserted
        fn find_insert_position(
            config: @LeaderboardConfig,
            entries: @Array<LeaderboardEntry>,
            new_entry: @LeaderboardEntry,
        ) -> Option<u32>;

        /// Validate if an entry can be inserted at a specific position
        fn validate_position(
            config: @LeaderboardConfig,
            entries: @Array<LeaderboardEntry>,
            new_entry: @LeaderboardEntry,
            position: u32,
        ) -> LeaderboardResult;

        /// Insert an entry into the leaderboard
        fn insert_entry(
            config: @LeaderboardConfig,
            entries: @Array<LeaderboardEntry>,
            new_entry: @LeaderboardEntry,
            position: u32,
        ) -> (Array<LeaderboardEntry>, LeaderboardResult);

        /// Check if an entry exists in the leaderboard
        fn contains_entry(entries: @Array<LeaderboardEntry>, id: u64) -> bool;

        /// Get the position of an entry by ID (0-based)
        fn get_entry_position(entries: @Array<LeaderboardEntry>, id: u64) -> Option<u32>;

        /// Check if a score qualifies for the leaderboard
        fn qualifies_for_leaderboard(
            config: @LeaderboardConfig, entries: @Array<LeaderboardEntry>, score: u32,
        ) -> bool;
    }

    /// Implementation of LeaderboardOperations
    pub impl LeaderboardOperationsImpl of LeaderboardOperations {
        fn find_insert_position(
            config: @LeaderboardConfig,
            entries: @Array<LeaderboardEntry>,
            new_entry: @LeaderboardEntry,
        ) -> Option<u32> {
            let mut position = 0_u32;
            let entries_len = entries.len();

            // If leaderboard is empty, insert at position 0
            if entries_len == 0 {
                return Option::Some(0);
            }

            // Find the correct position
            loop {
                if position >= entries_len {
                    // Insert at the end if we've reached the end
                    break Option::Some(entries_len);
                }

                let current_entry = entries.at(position);

                // Check if new score is better than current position
                if config.is_better_score(*new_entry.score, *current_entry.score) {
                    break Option::Some(position);
                }

                // Handle ties
                if config.is_equal_score(*new_entry.score, *current_entry.score) {
                    if config.break_tie(new_entry, current_entry) {
                        break Option::Some(position);
                    }
                }

                position += 1;
            }
        }

        fn validate_position(
            config: @LeaderboardConfig,
            entries: @Array<LeaderboardEntry>,
            new_entry: @LeaderboardEntry,
            position: u32,
        ) -> LeaderboardResult {
            let entries_len = entries.len();

            // Check if entry already exists
            if Self::contains_entry(entries, *new_entry.id) {
                return LeaderboardResult::DuplicateEntry;
            }

            // Validate position bounds
            if position > entries_len {
                return LeaderboardResult::InvalidPosition;
            }

            // Check if leaderboard is full and new entry would be beyond max
            if entries_len >= (*config.max_entries).into()
                && position >= (*config.max_entries).into() {
                return LeaderboardResult::LeaderboardFull;
            }

            // Validate score at position
            if position < entries_len {
                let current_at_position = entries.at(position);

                // New score must be better than or equal to current at position
                if !config.is_better_score(*new_entry.score, *current_at_position.score)
                    && !config.is_equal_score(*new_entry.score, *current_at_position.score) {
                    return LeaderboardResult::ScoreTooLow;
                }

                // If equal scores, must win tie-breaker
                if config.is_equal_score(*new_entry.score, *current_at_position.score)
                    && !config.break_tie(new_entry, current_at_position) {
                    return LeaderboardResult::ScoreTooLow;
                }
            }

            // Validate against entry above (if exists)
            if position > 0 {
                let above_entry = entries.at(position - 1);

                // New score must not be better than entry above
                if config.is_better_score(*new_entry.score, *above_entry.score) {
                    return LeaderboardResult::ScoreTooHigh;
                }

                // If equal scores with entry above, must lose tie-breaker
                if config.is_equal_score(*new_entry.score, *above_entry.score)
                    && config.break_tie(new_entry, above_entry) {
                    return LeaderboardResult::ScoreTooHigh;
                }
            }

            LeaderboardResult::Success
        }

        fn insert_entry(
            config: @LeaderboardConfig,
            entries: @Array<LeaderboardEntry>,
            new_entry: @LeaderboardEntry,
            position: u32,
        ) -> (Array<LeaderboardEntry>, LeaderboardResult) {
            // Validate the insertion
            let validation_result = Self::validate_position(config, entries, new_entry, position);
            match validation_result {
                LeaderboardResult::Success => {},
                _ => {
                    // Return a copy of the original array
                    let mut cloned_entries = ArrayTrait::new();
                    let mut i = 0_u32;
                    loop {
                        if i >= entries.len() {
                            break;
                        }
                        cloned_entries.append(*entries.at(i));
                        i += 1;
                    };
                    return (cloned_entries, validation_result);
                },
            }

            let mut new_leaderboard = ArrayTrait::new();
            let entries_len = entries.len();
            let max_entries: u32 = (*config.max_entries).into();
            let mut i = 0_u32;

            // Copy entries up to the insertion position
            loop {
                if i >= position {
                    break;
                }
                new_leaderboard.append(*entries.at(i));
                i += 1;
            };

            // Insert the new entry
            new_leaderboard.append(*new_entry);

            // Copy remaining entries up to max_entries - 1
            loop {
                if i >= entries_len || new_leaderboard.len() >= max_entries {
                    break;
                }
                new_leaderboard.append(*entries.at(i));
                i += 1;
            };

            (new_leaderboard, LeaderboardResult::Success)
        }

        fn contains_entry(entries: @Array<LeaderboardEntry>, id: u64) -> bool {
            let mut i = 0_u32;
            loop {
                if i >= entries.len() {
                    break false;
                }
                if *entries.at(i).id == id {
                    break true;
                }
                i += 1;
            }
        }

        fn get_entry_position(entries: @Array<LeaderboardEntry>, id: u64) -> Option<u32> {
            let mut i = 0_u32;
            loop {
                if i >= entries.len() {
                    break Option::None;
                }
                if *entries.at(i).id == id {
                    break Option::Some(i);
                }
                i += 1;
            }
        }

        fn qualifies_for_leaderboard(
            config: @LeaderboardConfig, entries: @Array<LeaderboardEntry>, score: u32,
        ) -> bool {
            let entries_len = entries.len();

            // If leaderboard isn't full, any score qualifies
            if entries_len < (*config.max_entries).into() {
                return true;
            }

            // Check against last entry
            let last_entry = entries.at(entries_len - 1);
            config.is_better_score(score, *last_entry.score)
        }
    }

    /// Utility functions for leaderboard management
    pub trait LeaderboardUtils {
        /// Convert 1-based position to 0-based index
        fn position_to_index(position: u8) -> Option<u32>;

        /// Convert 0-based index to 1-based position
        fn index_to_position(index: u32) -> Option<u8>;

        /// Create a new empty leaderboard
        fn new() -> Array<LeaderboardEntry>;

        /// Get entries within a range (for pagination)
        fn get_range(
            entries: @Array<LeaderboardEntry>, start: u32, count: u32,
        ) -> Array<LeaderboardEntry>;

        /// Get top N entries
        fn get_top_n(entries: @Array<LeaderboardEntry>, n: u32) -> Array<LeaderboardEntry>;

        /// Check if leaderboard is full
        fn is_full(config: @LeaderboardConfig, entries: @Array<LeaderboardEntry>) -> bool;

        /// Get the minimum qualifying score
        fn get_qualifying_score(
            config: @LeaderboardConfig, entries: @Array<LeaderboardEntry>,
        ) -> Option<u32>;
    }

    /// Implementation of LeaderboardUtils
    pub impl LeaderboardUtilsImpl of LeaderboardUtils {
        fn position_to_index(position: u8) -> Option<u32> {
            if position == 0 {
                Option::None
            } else {
                Option::Some((position - 1).into())
            }
        }

        fn index_to_position(index: u32) -> Option<u8> {
            if index > 254 {
                Option::None
            } else {
                Option::Some((index + 1).try_into().unwrap())
            }
        }

        fn new() -> Array<LeaderboardEntry> {
            ArrayTrait::new()
        }

        fn get_range(
            entries: @Array<LeaderboardEntry>, start: u32, count: u32,
        ) -> Array<LeaderboardEntry> {
            let mut result = ArrayTrait::new();
            let entries_len = entries.len();
            let end = core::cmp::min(start + count, entries_len);
            let mut i = start;

            loop {
                if i >= end {
                    break;
                }
                result.append(*entries.at(i));
                i += 1;
            };

            result
        }

        fn get_top_n(entries: @Array<LeaderboardEntry>, n: u32) -> Array<LeaderboardEntry> {
            Self::get_range(entries, 0, n)
        }

        fn is_full(config: @LeaderboardConfig, entries: @Array<LeaderboardEntry>) -> bool {
            entries.len() >= (*config.max_entries).into()
        }

        fn get_qualifying_score(
            config: @LeaderboardConfig, entries: @Array<LeaderboardEntry>,
        ) -> Option<u32> {
            if !Self::is_full(config, entries) {
                // If not full, any score qualifies
                Option::None
            } else {
                // Return the score of the last entry
                let last_idx = entries.len() - 1;
                Option::Some(*entries.at(last_idx).score)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::leaderboard::{
        LeaderboardConfig, LeaderboardEntry, LeaderboardResult, LeaderboardOperationsImpl,
        LeaderboardUtilsImpl, ScoreComparatorImpl,
    };

    #[test]
    fn test_empty_leaderboard_insertion() {
        let config = LeaderboardConfig { max_entries: 10, ascending: false, allow_ties: true };
        let mut entries = LeaderboardUtilsImpl::new();
        let new_entry = LeaderboardEntry { id: 1, score: 100 };

        let position = LeaderboardOperationsImpl::find_insert_position(
            @config, @entries, @new_entry,
        );
        assert!(position == Option::Some(0), "Should insert at position 0 in empty leaderboard");

        let (updated, result) = LeaderboardOperationsImpl::insert_entry(
            @config, @entries, @new_entry, 0,
        );
        match result {
            LeaderboardResult::Success => {},
            _ => panic!("Should successfully insert into empty leaderboard"),
        }
        assert!(updated.len() == 1, "Leaderboard should have 1 entry");
        assert!(*updated.at(0).id == 1, "Entry should have correct ID");
    }

    #[test]
    fn test_leaderboard_ordering_descending() {
        let config = LeaderboardConfig { max_entries: 5, ascending: false, allow_ties: true };
        let mut entries = ArrayTrait::new();
        entries.append(LeaderboardEntry { id: 1, score: 100 });
        entries.append(LeaderboardEntry { id: 2, score: 80 });
        entries.append(LeaderboardEntry { id: 3, score: 60 });

        let new_entry = LeaderboardEntry { id: 4, score: 90 };
        let position = LeaderboardOperationsImpl::find_insert_position(
            @config, @entries, @new_entry,
        );
        assert!(position == Option::Some(1), "Should insert at position 1");

        let (updated, result) = LeaderboardOperationsImpl::insert_entry(
            @config, @entries, @new_entry, 1,
        );
        match result {
            LeaderboardResult::Success => {},
            _ => panic!("Should successfully insert"),
        }
        assert!(*updated.at(0).score == 100, "First should be 100");
        assert!(*updated.at(1).score == 90, "Second should be 90");
        assert!(*updated.at(2).score == 80, "Third should be 80");
        assert!(*updated.at(3).score == 60, "Fourth should be 60");
    }

    #[test]
    fn test_leaderboard_max_entries() {
        let config = LeaderboardConfig { max_entries: 3, ascending: false, allow_ties: true };
        let mut entries = ArrayTrait::new();
        entries.append(LeaderboardEntry { id: 1, score: 100 });
        entries.append(LeaderboardEntry { id: 2, score: 80 });
        entries.append(LeaderboardEntry { id: 3, score: 60 });

        // Try to insert a low score
        let new_entry = LeaderboardEntry { id: 4, score: 50 };
        let (_, result) = LeaderboardOperationsImpl::insert_entry(@config, @entries, @new_entry, 3);
        match result {
            LeaderboardResult::LeaderboardFull => {},
            _ => panic!("Should return LeaderboardFull"),
        }

        // Insert a high score
        let high_entry = LeaderboardEntry { id: 5, score: 90 };
        let (updated, result) = LeaderboardOperationsImpl::insert_entry(
            @config, @entries, @high_entry, 1,
        );
        match result {
            LeaderboardResult::Success => {},
            _ => panic!("Should successfully insert high score"),
        }
        assert!(updated.len() == 3, "Should maintain max entries");
        assert!(*updated.at(2).score == 80, "Lowest score should be 80");
    }

    #[test]
    fn test_tie_breaking() {
        let config = LeaderboardConfig { max_entries: 5, ascending: false, allow_ties: true };
        let mut entries = ArrayTrait::new();
        entries.append(LeaderboardEntry { id: 2, score: 100 });

        let new_entry = LeaderboardEntry { id: 1, score: 100 };
        let position = LeaderboardOperationsImpl::find_insert_position(
            @config, @entries, @new_entry,
        );
        assert!(position == Option::Some(0), "Lower ID should win tie");

        let (updated, _) = LeaderboardOperationsImpl::insert_entry(
            @config, @entries, @new_entry, 0,
        );
        assert!(*updated.at(0).id == 1, "ID 1 should be first");
        assert!(*updated.at(1).id == 2, "ID 2 should be second");
    }

    #[test]
    fn test_duplicate_entry_prevention() {
        let config = LeaderboardConfig { max_entries: 5, ascending: false, allow_ties: true };
        let mut entries = ArrayTrait::new();
        entries.append(LeaderboardEntry { id: 1, score: 100 });

        let duplicate = LeaderboardEntry { id: 1, score: 200 };
        let (_, result) = LeaderboardOperationsImpl::insert_entry(@config, @entries, @duplicate, 0);
        match result {
            LeaderboardResult::DuplicateEntry => {},
            _ => panic!("Should prevent duplicate entries"),
        }
    }

    #[test]
    fn test_position_validation() {
        let config = LeaderboardConfig { max_entries: 5, ascending: false, allow_ties: true };
        let mut entries = ArrayTrait::new();
        entries.append(LeaderboardEntry { id: 1, score: 100 });
        entries.append(LeaderboardEntry { id: 2, score: 50 });

        // Try to insert at invalid position (gap)
        let new_entry = LeaderboardEntry { id: 3, score: 75 };
        let (_, result) = LeaderboardOperationsImpl::insert_entry(@config, @entries, @new_entry, 3);
        match result {
            LeaderboardResult::InvalidPosition => {},
            _ => panic!("Should return InvalidPosition for gap"),
        }

        // Try to insert with wrong score for position
        let wrong_score = LeaderboardEntry { id: 4, score: 40 };
        let (_, result) = LeaderboardOperationsImpl::insert_entry(
            @config, @entries, @wrong_score, 0,
        );
        match result {
            LeaderboardResult::ScoreTooLow => {},
            _ => panic!("Should return ScoreTooLow"),
        }
    }

    #[test]
    fn test_utils_functions() {
        // Test position/index conversion
        assert!(
            LeaderboardUtilsImpl::position_to_index(1) == Option::Some(0),
            "Position 1 should be index 0",
        );
        assert!(
            LeaderboardUtilsImpl::position_to_index(0) == Option::None, "Position 0 should be None",
        );
        assert!(
            LeaderboardUtilsImpl::index_to_position(0) == Option::Some(1),
            "Index 0 should be position 1",
        );

        // Test get_top_n
        let mut entries = ArrayTrait::new();
        entries.append(LeaderboardEntry { id: 1, score: 100 });
        entries.append(LeaderboardEntry { id: 2, score: 80 });
        entries.append(LeaderboardEntry { id: 3, score: 60 });

        let top_2 = LeaderboardUtilsImpl::get_top_n(@entries, 2);
        assert!(top_2.len() == 2, "Should return 2 entries");
        assert!(*top_2.at(0).score == 100, "First should be 100");
        assert!(*top_2.at(1).score == 80, "Second should be 80");
    }
}
