// SPDX-License-Identifier: BUSL-1.1

use leaderboard::libs::leaderboard::leaderboard::{
    LeaderboardConfig, LeaderboardEntry, LeaderboardResult, LeaderboardOperationsImpl,
    LeaderboardUtilsImpl, ScoreComparatorImpl,
};

#[test]
fn test_empty_leaderboard_insertion() {
    let config = LeaderboardConfig { max_entries: 10, ascending: false, allow_ties: true };
    let mut entries = LeaderboardUtilsImpl::new();
    let new_entry = LeaderboardEntry { id: 1, score: 100 };

    let position = LeaderboardOperationsImpl::find_insert_position(@config, @entries, @new_entry);
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
    let position = LeaderboardOperationsImpl::find_insert_position(@config, @entries, @new_entry);
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
    let position = LeaderboardOperationsImpl::find_insert_position(@config, @entries, @new_entry);
    assert!(position == Option::Some(0), "Lower ID should win tie");

    let (updated, _) = LeaderboardOperationsImpl::insert_entry(@config, @entries, @new_entry, 0);
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
    let (_, result) = LeaderboardOperationsImpl::insert_entry(@config, @entries, @wrong_score, 0);
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
