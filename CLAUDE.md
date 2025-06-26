# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Tools
- Scarb: 2.10.1 (Cairo/Starknet development)
- Dojo: 1.5.0 (Gaming framework)
- Bun: Latest (Frontend package manager)
- Docker Compose: Local development environment (Katana + Torii)

## Common Development Tasks

### Contract Development
```bash
# Build contracts
cd contracts && sozo build

# Run all tests
cd contracts && sozo test

# Run specific test
cd contracts && sozo test -f test_tournament_create

# Format Cairo code
cd contracts && scarb fmt

# Local development environment
docker compose up

# Deploy to different environments
cd contracts && ./scripts/deploy_dev.sh      # Local Katana
cd contracts && ./scripts/deploy_mainnet.sh  # StarkNet Mainnet
cd contracts && ./scripts/deploy_sepolia.sh  # Sepolia testnet
cd contracts && ./scripts/deploy_slot.sh     # Slot environment
```

### Frontend Development
```bash
# Install dependencies
cd ui && bun install

# Run development server
cd ui && bun run dev

# Run linting
cd ui && bun run lint

# Build for production
cd ui && bun run build
```

## Architecture Overview
Tournament platform built with Dojo on StarkNet - smart contracts + React UI for managing gaming tournaments with integrations to Denshokan (token registry) and Provable Games' game components.

### Key Components
- **Smart Contracts**: Tournament lifecycle management (Registration → Live → Submission → Finalized)
- **Frontend**: React + TypeScript + Zustand + shadcn/ui with Dojo SDK integration
- **External Integrations**: 
  - Denshokan: Token registry and game metadata system
  - Game Components: Minigame token and metagame interfaces

### Project Structure
```
contracts/
├── src/
│   ├── budokan.cairo             # Main tournament contract (IBudokan interface)
│   ├── interfaces.cairo          # Game integration interfaces
│   ├── libs/
│   │   ├── lifecycle.cairo       # Tournament state transitions
│   │   ├── schedule.cairo        # Tournament scheduling logic
│   │   ├── store.cairo           # Data storage abstractions
│   │   └── utils.cairo           # Helper functions
│   └── models/
│       ├── budokan.cairo         # Core tournament data models
│       ├── lifecycle.cairo       # Lifecycle state models
│       └── schedule.cairo        # Schedule data models
ui/
├── src/
│   ├── containers/               # Main pages (Tournament, Create, etc.)
│   ├── dojo/hooks/              # Contract interaction hooks
│   ├── hooks/                   # State management (Zustand stores)
│   └── components/              # UI components (shadcn/ui based)
```

### Environment Configurations
- **Local Dev**: Uses Katana local StarkNet via Docker
- **Mainnet**: Deploys to Realms World (0x5c6d0020a9927edca9ddc984b97305439c0b32a1ec8d3f0eaf6291074cc9799)
- **Testnets**: Sepolia and Slot configurations available

## Important Notes
- All contracts use Cairo language with Dojo framework
- Use Context7 MCP for up to date documentation on Cairo, Starknet, and Dojo
- All new additions to the code should seek to maintain minimal complexity at the Starknet Contract layer. This layer of the stack should be reserved for retrieving data, blockchain specific validation (caller address, nft ownership, etc.), and saving data. All core logic should be handled by pure Cairo functions with extensive unit tests for all functionality
- When `use_denshokan` is enabled, tournaments integrate with the Denshokan token registry for enhanced token metadata and game registry features

## Github Actions Workflow

1. Create a new branch
   - Branch name format: `claude/issue-{issue_number}`
2. Commit all changes to new branch
3. All new functions should be accompanied by exhaustive tests
4. Verify all tests pass using `cd contracts && sozo test`
5. Run `cd contracts && scarb fmt` to format contracts
6. Only when all tests are passing should a PR be created