# Tournaments Package

Core tournament management system for competitive gaming on StarkNet.

## Overview

This package provides the main tournament functionality including:
- Tournament creation and lifecycle management
- Player registration and entry management
- Prize distribution
- Integration with game contracts
- Score submission through leaderboard system

## Dependencies

- `leaderboard`: Leaderboard management functionality
- `openzeppelin_token`: Token standards for entry fees and prizes
- `openzeppelin_introspection`: Interface detection
- `dojo`: Gaming framework for StarkNet

## Key Components

### Models
- `Tournament`: Main tournament data structure
- `Registration`: Player registration tracking
- `Prize`: Prize configuration and claims
- `Schedule`: Tournament phases and timing
- `GameConfig`: Game-specific settings

### Tournament Component (`tournament.cairo`)
Main component providing:
- Tournament creation with customizable parameters
- Entry fee collection and distribution
- Entry requirement validation (token-gating, qualifications)
- Prize pool management
- Score submission integration with leaderboard

### Presets
- `Tournament`: Deployable contract implementing full tournament functionality

## Features

- **Flexible Entry Requirements**: Support for token-gating, qualification requirements
- **Entry Fee Management**: Configurable fee distribution to creators and prize pools
- **Multi-Phase Tournaments**: Registration → Live → Submission → Finalized
- **Prize Distribution**: Automatic distribution based on final rankings
- **Game Integration**: Works with any game implementing the IGameToken interface

## Usage

```cairo
use tournaments::presets::tournament::Tournament;
use tournaments::components::models::tournament::{Metadata, Schedule, GameConfig};

// Create a tournament
let metadata = Metadata {
    name: "Summer Championship",
    description: "Competitive tournament for top players"
};

let tournament = tournament_contract.create_tournament(
    creator_rewards_address,
    metadata,
    schedule,
    game_config,
    entry_fee,
    entry_requirement
);

// Players enter the tournament
tournament_contract.enter_tournament(
    tournament_id,
    player_name,
    player_address,
    qualification
);

// Submit scores (requires proper authorization)
tournament_contract.submit_score(tournament_id, token_id, position);

// Claim prizes after finalization
tournament_contract.claim_prize(tournament_id, prize_type);
```

## Testing

Run tests with:
```bash
cd packages/tournaments && scarb test
```

## License

BUSL-1.1