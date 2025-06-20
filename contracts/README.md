# Tournaments Contracts Workspace

This workspace contains the smart contracts for the tournaments platform, organized as a multi-package workspace following OpenZeppelin's pattern.

## Workspace Structure

```
contracts/
├── packages/
│   ├── tournaments/      # Core tournament management
│   └── leaderboard/      # Leaderboard management system
├── Scarb.toml           # Workspace configuration
└── README.md            # This file
```

## Packages

### tournaments
The main package containing core tournament functionality including:
- Tournament lifecycle management
- Player registration and entry management
- Prize distribution
- Game integration interfaces

### tournaments_leaderboard
A separate package for leaderboard management providing:
- Pure Cairo library for leaderboard operations
- Dojo contract preset for deployment
- Position-based score tracking
- Flexible configuration (ascending/descending)

## Building

To build all packages:
```bash
sozo build
```

## Testing

To run all tests:
```bash
sozo test
```

To run specific package tests:
```bash
cd packages/tournaments && scarb test
cd packages/leaderboard && scarb test
```

## Development

When developing new features:
1. Identify which package the feature belongs to
2. Add dependencies between packages as needed
3. Maintain clear separation of concerns
4. Write comprehensive tests for all functionality

## Architecture Benefits

This multi-package structure provides:
- **Modularity**: Clear separation between tournament logic and leaderboard functionality
- **Reusability**: Leaderboard can be used independently in other projects
- **Maintainability**: Easier to understand and modify specific components
- **Testing**: Focused unit tests for each package

## License

BUSL-1.1