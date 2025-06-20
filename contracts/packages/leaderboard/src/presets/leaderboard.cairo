// SPDX-License-Identifier: BUSL-1.1

use tournaments_leaderboard::interfaces::ILeaderboard;

/// Leaderboard contract implementation
#[dojo::contract]
pub mod Leaderboard {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use tournaments_leaderboard::models::leaderboard::{
        LeaderboardMetadata, LeaderboardEntry, LeaderboardResult, LeaderboardSubmission,
        LeaderboardEntryCount, LeaderboardCounter,
    };
    use tournaments_leaderboard::libs::leaderboard::leaderboard::{
        LeaderboardConfig, LeaderboardEntry as LibLeaderboardEntry, LeaderboardOperationsImpl,
        LeaderboardUtilsImpl,
    };
    use dojo::model::{ModelStorage};
    use dojo::world::{WorldStorageTrait};
    fn DEFAULT_NS() -> @ByteArray {
        @"tournaments"
    }

    #[storage]
    struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        LeaderboardCreated: LeaderboardCreated,
        ScoreSubmitted: ScoreSubmitted,
        LeaderboardFinalized: LeaderboardFinalized,
    }

    #[derive(Drop, starknet::Event)]
    struct LeaderboardCreated {
        leaderboard_id: u64,
        creator: ContractAddress,
        game_address: ContractAddress,
        max_entries: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct ScoreSubmitted {
        leaderboard_id: u64,
        token_id: u64,
        score: u32,
        position: u8,
        submitted_by: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct LeaderboardFinalized {
        leaderboard_id: u64,
        finalized_by: ContractAddress,
        timestamp: u64,
    }

    #[abi(embed_v0)]
    impl LeaderboardImpl of super::ILeaderboard<ContractState> {
        // CREATE operations
        fn create_leaderboard(
            ref self: ContractState,
            game_address: ContractAddress,
            name: ByteArray,
            description: ByteArray,
            max_entries: u8,
            ascending: bool,
        ) -> u64 {
            let world = self.world_dispatcher();
            let caller = get_caller_address();
            let timestamp = get_block_timestamp();

            // Get next leaderboard ID
            let namespace = DEFAULT_NS();
            let mut storage = WorldStorageTrait::new(world, namespace);
            let mut counter: LeaderboardCounter = storage.read_model('LEADERBOARD_COUNTER');
            counter.count += 1;
            let leaderboard_id = counter.count;
            storage.write_model(@counter);

            // Create leaderboard metadata
            let metadata = LeaderboardMetadata {
                id: leaderboard_id,
                game_address,
                name,
                description,
                creator: caller,
                max_entries,
                ascending,
                is_finalized: false,
                created_at: timestamp,
            };
            storage.write_model(@metadata);

            // Initialize entry count
            let entry_count = LeaderboardEntryCount { leaderboard_id, count: 0 };
            storage.write_model(@entry_count);

            self
                .emit(
                    LeaderboardCreated {
                        leaderboard_id, creator: caller, game_address, max_entries,
                    },
                );

            leaderboard_id
        }

        // UPDATE operations
        fn submit_score(
            ref self: ContractState, leaderboard_id: u64, token_id: u64, score: u32, position: u8,
        ) -> LeaderboardResult {
            let world = self.world_dispatcher();
            let caller = get_caller_address();
            let timestamp = get_block_timestamp();

            // Get leaderboard metadata
            let namespace = DEFAULT_NS();
            let mut storage = WorldStorageTrait::new(world, namespace);
            let metadata: LeaderboardMetadata = storage.read_model(leaderboard_id);
            if metadata.id == 0 {
                return LeaderboardResult::InvalidLeaderboard;
            }

            // Check authorization - only creator can submit scores
            if metadata.creator != caller {
                return LeaderboardResult::Unauthorized;
            }

            // Check if leaderboard is finalized
            if metadata.is_finalized {
                return LeaderboardResult::LeaderboardFinalized;
            }

            // Check if token already submitted
            let submission: LeaderboardSubmission = storage.read_model((leaderboard_id, token_id));
            if submission.has_submitted {
                return LeaderboardResult::DuplicateEntry;
            }

            // Validate position (1-based)
            if position == 0 || position > metadata.max_entries {
                return LeaderboardResult::InvalidPosition;
            }

            // Get current entries
            let current_entries = self
                ._get_entries_as_lib_format(leaderboard_id, metadata.max_entries);
            let config = LeaderboardConfig {
                max_entries: metadata.max_entries, ascending: metadata.ascending, allow_ties: true,
            };

            // Create new entry
            let new_entry = LibLeaderboardEntry { id: token_id, score };

            // Convert 1-based position to 0-based index
            let position_index = match LeaderboardUtilsImpl::position_to_index(position) {
                Option::Some(idx) => idx,
                Option::None => { return LeaderboardResult::InvalidPosition; },
            };

            // Validate and insert using the pure library
            let (updated_entries, result) = LeaderboardOperationsImpl::insert_entry(
                @config, @current_entries, @new_entry, position_index,
            );

            match result {
                tournaments_leaderboard::libs::leaderboard::leaderboard::LeaderboardResult::Success => {
                    // Update entry count before moving updated_entries
                    let new_count = updated_entries.len().try_into().unwrap();

                    // Update all positions
                    self
                        ._update_leaderboard_entries(
                            leaderboard_id, updated_entries, timestamp, caller,
                        );

                    // Mark as submitted
                    let submission = LeaderboardSubmission {
                        leaderboard_id, token_id, has_submitted: true, position,
                    };
                    storage.write_model(@submission);

                    // Update entry count
                    let mut entry_count: LeaderboardEntryCount = storage.read_model(leaderboard_id);
                    entry_count.count = new_count;
                    storage.write_model(@entry_count);

                    self
                        .emit(
                            ScoreSubmitted {
                                leaderboard_id, token_id, score, position, submitted_by: caller,
                            },
                        );

                    LeaderboardResult::Success
                },
                tournaments_leaderboard::libs::leaderboard::leaderboard::LeaderboardResult::InvalidPosition => {
                    LeaderboardResult::InvalidPosition
                },
                tournaments_leaderboard::libs::leaderboard::leaderboard::LeaderboardResult::LeaderboardFull => {
                    LeaderboardResult::LeaderboardFull
                },
                tournaments_leaderboard::libs::leaderboard::leaderboard::LeaderboardResult::ScoreTooLow => {
                    LeaderboardResult::ScoreTooLow
                },
                tournaments_leaderboard::libs::leaderboard::leaderboard::LeaderboardResult::ScoreTooHigh => {
                    LeaderboardResult::ScoreTooHigh
                },
                tournaments_leaderboard::libs::leaderboard::leaderboard::LeaderboardResult::DuplicateEntry => {
                    LeaderboardResult::DuplicateEntry
                },
                tournaments_leaderboard::libs::leaderboard::leaderboard::LeaderboardResult::InvalidConfig => {
                    LeaderboardResult::InvalidLeaderboard
                },
            }
        }

        fn finalize_leaderboard(ref self: ContractState, leaderboard_id: u64) {
            let world = self.world_dispatcher();
            let caller = get_caller_address();
            let timestamp = get_block_timestamp();

            // Get leaderboard metadata
            let namespace = DEFAULT_NS();
            let mut storage = WorldStorageTrait::new(world, namespace);
            let mut metadata: LeaderboardMetadata = storage.read_model(leaderboard_id);
            assert!(metadata.id != 0, "Invalid leaderboard");
            assert!(metadata.creator == caller, "Unauthorized");
            assert!(!metadata.is_finalized, "Already finalized");

            // Update metadata
            metadata.is_finalized = true;
            storage.write_model(@metadata);

            self.emit(LeaderboardFinalized { leaderboard_id, finalized_by: caller, timestamp });
        }

        // READ operations
        fn get_leaderboard_metadata(
            self: @ContractState, leaderboard_id: u64,
        ) -> LeaderboardMetadata {
            let world = self.world_dispatcher();
            let namespace = DEFAULT_NS();
            let mut storage = WorldStorageTrait::new(world, namespace);
            storage.read_model(leaderboard_id)
        }

        fn get_leaderboard_entries(
            self: @ContractState, leaderboard_id: u64,
        ) -> Array<LeaderboardEntry> {
            let world = self.world_dispatcher();
            let namespace = DEFAULT_NS();
            let mut storage = WorldStorageTrait::new(world, namespace);
            let mut entries = ArrayTrait::new();
            let entry_count: LeaderboardEntryCount = storage.read_model(leaderboard_id);

            let mut position = 1_u8;
            loop {
                if position > entry_count.count {
                    break;
                }

                let entry: LeaderboardEntry = storage.read_model((leaderboard_id, position));
                if entry.token_id != 0 { // Valid entry
                    entries.append(entry);
                }
                position += 1;
            };

            entries
        }

        fn get_entry_at_position(
            self: @ContractState, leaderboard_id: u64, position: u8,
        ) -> LeaderboardEntry {
            let world = self.world_dispatcher();
            let namespace = DEFAULT_NS();
            let mut storage = WorldStorageTrait::new(world, namespace);
            storage.read_model((leaderboard_id, position))
        }

        fn get_entry_position(
            self: @ContractState, leaderboard_id: u64, token_id: u64,
        ) -> Option<u8> {
            let world = self.world_dispatcher();
            let namespace = DEFAULT_NS();
            let mut storage = WorldStorageTrait::new(world, namespace);
            let submission: LeaderboardSubmission = storage.read_model((leaderboard_id, token_id));

            if submission.has_submitted {
                Option::Some(submission.position)
            } else {
                Option::None
            }
        }

        fn has_submitted(self: @ContractState, leaderboard_id: u64, token_id: u64) -> bool {
            let world = self.world_dispatcher();
            let namespace = DEFAULT_NS();
            let mut storage = WorldStorageTrait::new(world, namespace);
            let submission: LeaderboardSubmission = storage.read_model((leaderboard_id, token_id));
            submission.has_submitted
        }

        fn is_finalized(self: @ContractState, leaderboard_id: u64) -> bool {
            let metadata = self.get_leaderboard_metadata(leaderboard_id);
            metadata.is_finalized
        }

        fn get_leaderboard_size(self: @ContractState, leaderboard_id: u64) -> u8 {
            let world = self.world_dispatcher();
            let namespace = DEFAULT_NS();
            let mut storage = WorldStorageTrait::new(world, namespace);
            let entry_count: LeaderboardEntryCount = storage.read_model(leaderboard_id);
            entry_count.count
        }

        // Utility operations
        fn qualifies_for_leaderboard(
            self: @ContractState, leaderboard_id: u64, score: u32,
        ) -> bool {
            let metadata = self.get_leaderboard_metadata(leaderboard_id);
            if metadata.id == 0 {
                return false;
            }

            let entry_count = self.get_leaderboard_size(leaderboard_id);

            // If not full, any score qualifies
            if entry_count < metadata.max_entries {
                return true;
            }

            // Get last entry
            let last_entry = self.get_entry_at_position(leaderboard_id, entry_count);

            // Compare scores based on ascending/descending
            if metadata.ascending {
                score < last_entry.score
            } else {
                score > last_entry.score
            }
        }

        fn get_minimum_qualifying_score(self: @ContractState, leaderboard_id: u64) -> Option<u32> {
            let metadata = self.get_leaderboard_metadata(leaderboard_id);
            let entry_count = self.get_leaderboard_size(leaderboard_id);

            if entry_count < metadata.max_entries {
                // Not full, any score qualifies
                Option::None
            } else {
                // Return the score of the last entry
                let last_entry = self.get_entry_at_position(leaderboard_id, entry_count);
                Option::Some(last_entry.score)
            }
        }
    }

    // Internal functions
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        /// Get entries in the format expected by the pure library
        fn _get_entries_as_lib_format(
            self: @ContractState, leaderboard_id: u64, max_entries: u8,
        ) -> Array<LibLeaderboardEntry> {
            let world = self.world_dispatcher();
            let namespace = DEFAULT_NS();
            let mut storage = WorldStorageTrait::new(world, namespace);
            let mut entries = ArrayTrait::new();

            let mut position = 1_u8;
            loop {
                if position > max_entries {
                    break;
                }

                let entry: LeaderboardEntry = storage.read_model((leaderboard_id, position));
                if entry.token_id != 0 { // Valid entry
                    entries.append(LibLeaderboardEntry { id: entry.token_id, score: entry.score });
                }
                position += 1;
            };

            entries
        }

        /// Update all leaderboard entries after a change
        fn _update_leaderboard_entries(
            ref self: ContractState,
            leaderboard_id: u64,
            entries: Array<LibLeaderboardEntry>,
            timestamp: u64,
            submitted_by: ContractAddress,
        ) {
            let world = self.world_dispatcher();
            let namespace = DEFAULT_NS();
            let mut storage = WorldStorageTrait::new(world, namespace);

            // Clear and update all positions
            let mut position = 1_u8;
            let entries_len = entries.len();

            loop {
                if position.into() > entries_len {
                    break;
                }

                let lib_entry = entries.at((position - 1).into());
                let entry = LeaderboardEntry {
                    leaderboard_id,
                    position,
                    token_id: *lib_entry.id,
                    score: *lib_entry.score,
                    submitted_at: timestamp,
                    submitted_by,
                };
                storage.write_model(@entry);

                // Update submission record with new position
                let submission = LeaderboardSubmission {
                    leaderboard_id, token_id: *lib_entry.id, has_submitted: true, position,
                };
                storage.write_model(@submission);

                position += 1;
            };
        }
    }
}
