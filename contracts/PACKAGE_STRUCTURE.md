# Tournament Platform Package Structure

This document outlines the multi-package structure of the tournament platform, following OpenZeppelin's pattern for modular Cairo contracts.

## Package Organization

### Root Workspace (`/workspace/tournaments/contracts/`)
- **Scarb.toml**: Workspace configuration defining member packages
- **README.md**: Overview of the workspace structure
- **Dojo configuration files**: For deployment and testing

### Package: `tournaments_leaderboard` (`packages/leaderboard/`)
A standalone leaderboard management system that can be used independently.

**Features:**
- Pure Cairo library for leaderboard logic (no storage dependencies)
- Dojo contract preset for deployment
- REST-like CRUD interface
- Ownership-based access control

**Structure:**
```
packages/leaderboard/
├── Scarb.toml              # Package configuration
├── README.md               # Package documentation
└── src/
    ├── lib.cairo           # Package exports
    ├── interfaces.cairo    # ILeaderboard, ILeaderboardContract
    ├── models/
    │   └── leaderboard.cairo   # Data models
    ├── libs/
    │   └── leaderboard.cairo   # Pure Cairo implementation
    ├── presets/
    │   └── leaderboard.cairo   # Dojo contract
    └── tests/
        └── test_leaderboard.cairo  # Unit tests
```

### Package: `tournaments` (`packages/tournaments/`)
Core tournament management functionality that depends on the leaderboard package.

**Dependencies:**
- `tournaments_leaderboard`: For leaderboard functionality
- `openzeppelin_token`: For ERC20/ERC721 support
- `openzeppelin_introspection`: For interface detection

**Structure:**
```
packages/tournaments/
├── Scarb.toml              # Package configuration
├── README.md               # Package documentation
└── src/
    ├── lib.cairo           # Package exports
    ├── components/
    │   ├── tournament.cairo      # Main tournament component
    │   ├── interfaces.cairo      # Game interfaces, re-exports
    │   ├── models/              # Tournament data models
    │   ├── libs/               # Helper libraries
    │   └── tests/              # Component tests
    └── presets/
        └── tournament.cairo      # Deployable contract
```

## Key Design Decisions

1. **Separation of Concerns**: Leaderboard functionality is completely independent from tournament logic
2. **Interface Compatibility**: The `ILeaderboardContract` interface is re-exported from the tournaments package for backward compatibility
3. **Pure Library Pattern**: The leaderboard library has no storage dependencies, making it highly reusable
4. **Dojo Integration**: Both packages include Dojo presets for easy deployment

## Benefits

- **Modularity**: Clear separation between different functionalities
- **Reusability**: Other projects can use just the leaderboard package
- **Maintainability**: Each package has a focused responsibility
- **Testing**: Isolated unit tests for each package
- **Versioning**: Packages can be versioned independently

## Usage Example

```cairo
// Using the leaderboard package independently
use tournaments_leaderboard::interfaces::ILeaderboardContract;
use tournaments_leaderboard::models::leaderboard::LeaderboardResult;

// Using the tournament package (which includes leaderboard)
use tournaments::presets::tournament::Tournament;
use tournaments::components::interfaces::ILeaderboardContract;
```

## Building and Testing

```bash
# Build all packages
sozo build

# Test all packages
sozo test

# Test individual packages
cd packages/leaderboard && scarb test
cd packages/tournaments && scarb test
```

This structure follows the same pattern as OpenZeppelin's Cairo contracts, providing a clean, modular architecture for the tournament platform.