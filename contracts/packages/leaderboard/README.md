# Tournaments Leaderboard Package

This package provides a comprehensive leaderboard management system for the tournaments platform.

## Features

- **Pure Cairo Library**: Core leaderboard logic without storage dependencies
- **Flexible Configuration**: Support for ascending/descending scores and tie-breaking
- **Efficient Operations**: Optimized insertion and position validation
- **Dojo Integration**: Ready-to-use contract preset with Dojo storage
- **Position Management**: 1-based positioning with automatic score ordering

## Components

### Models (`models/leaderboard.cairo`)
- `LeaderboardMetadata`: Stores leaderboard configuration and metadata
- `LeaderboardEntry`: Individual entries with position, score, and submission details
- `LeaderboardSubmission`: Tracks token submissions
- `LeaderboardEntryCount`: Maintains entry count per leaderboard
- `LeaderboardCounter`: Global leaderboard counter

### Library (`libs/leaderboard.cairo`)
Pure Cairo implementation providing:
- Score comparison and tie-breaking logic
- Position validation and insertion
- Entry management utilities
- Pagination and range queries

### Preset (`presets/leaderboard.cairo`)
Full Dojo contract implementation with:
- Leaderboard creation and management
- Score submission with position validation
- Finalization support
- Query operations for entries and positions

### Interfaces (`interfaces.cairo`)
- `ILeaderboard`: Main interface for leaderboard operations
- `ILeaderboardContract`: Compatible interface for external contracts

## Usage

```cairo
use leaderboard::interfaces::ILeaderboardContract;
use leaderboard::models::leaderboard::{LeaderboardResult};

// Deploy the leaderboard contract
let leaderboard_contract = // ... deploy Leaderboard preset

// Create a new leaderboard
let leaderboard_id = leaderboard_contract.create_leaderboard(
    game_address,
    "My Tournament",
    "Tournament Description",
    10,  // max_entries
    false // descending (higher scores better)
);

// Submit a score
let result = leaderboard_contract.submit_score(
    leaderboard_id,
    token_id,
    score,
    position
);

// Query entries
let entries = leaderboard_contract.get_leaderboard_entries(leaderboard_id);
```

## Testing

Run tests with:
```bash
cd packages/leaderboard && scarb test
```

## License

BUSL-1.1