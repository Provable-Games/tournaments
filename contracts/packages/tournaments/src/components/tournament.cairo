// SPDX-License-Identifier: BUSL-1.1

use starknet::ContractAddress;
use tournaments::components::models::tournament::{
    Tournament as TournamentModel, TokenType, Registration, Prize, PrizeType, Metadata, GameConfig,
    EntryFee, EntryRequirement, QualificationProof,
};
use tournaments::components::models::schedule::{Schedule, Phase};

///
/// Interface
///

#[starknet::interface]
trait ITournament<TState> {
    fn create_tournament(
        ref self: TState,
        creator_rewards_address: ContractAddress,
        metadata: Metadata,
        schedule: Schedule,
        game_config: GameConfig,
        entry_fee: Option<EntryFee>,
        entry_requirement: Option<EntryRequirement>,
    ) -> TournamentModel;
    fn enter_tournament(
        ref self: TState,
        tournament_id: u64,
        player_name: felt252,
        player_address: ContractAddress,
        qualification: Option<QualificationProof>,
    ) -> (u64, u32);
    fn submit_score(ref self: TState, tournament_id: u64, token_id: u64, position: u8);
    fn claim_prize(ref self: TState, tournament_id: u64, prize_type: PrizeType);
    fn add_prize(
        ref self: TState,
        tournament_id: u64,
        token_address: ContractAddress,
        token_type: TokenType,
        position: u8,
    ) -> u64;
    fn total_tournaments(self: @TState) -> u64;
    fn tournament(self: @TState, tournament_id: u64) -> TournamentModel;
    fn get_registration(
        self: @TState, game_address: ContractAddress, token_id: u64,
    ) -> Registration;
    fn get_prize(self: @TState, prize_id: u64) -> Prize;
    fn tournament_entries(self: @TState, tournament_id: u64) -> u32;
    fn is_token_registered(self: @TState, address: ContractAddress) -> bool;
    fn register_token(ref self: TState, address: ContractAddress, token_type: TokenType);
    fn get_leaderboard(self: @TState, tournament_id: u64) -> Array<u64>;
    fn current_phase(self: @TState, tournament_id: u64) -> Phase;
    fn get_tournament_id_for_token_id(
        self: @TState, game_address: ContractAddress, token_id: u64,
    ) -> u64;
}

///
/// Tournament Component
///

#[starknet::component]
pub mod tournament_component {
    use super::ITournament;

    use core::num::traits::Zero;

    use tournaments::components::constants::{
        TWO_POW_128, DEFAULT_NS, VERSION, SEPOLIA_CHAIN_ID, GAME_CREATOR_TOKEN_ID,
    };
    use tournaments::components::interfaces::{
        IGameTokenDispatcher, IGameTokenDispatcherTrait, IGameDetailsDispatcher,
        IGameDetailsDispatcherTrait, IGAMETOKEN_ID, IGAME_METADATA_ID,
    };
    use tournaments::components::models::tournament::{
        Tournament as TournamentModel, Registration, Prize, Token, TournamentConfig, TokenType,
        TournamentType, ERC20Data, ERC721Data, PrizeType, Role, PrizeClaim, Metadata, GameConfig,
        EntryFee, EntryRequirement, QualificationProof, TournamentQualification,
        EntryRequirementType,
    };
    use tournaments::components::models::schedule::{Schedule, Phase};
    use tournaments::components::interfaces::{WorldTrait, WorldImpl};
    use tournaments::components::libs::store::{Store, StoreTrait};
    use tournaments::components::libs::schedule::{
        ScheduleTrait, ScheduleImpl, ScheduleAssertionsTrait, ScheduleAssertionsImpl,
    };
    use tournaments::components::interfaces::{ISettingsDispatcher, ISettingsDispatcherTrait};

    // Import leaderboard store helpers
    use tournaments::components::libs::leaderboard_store::{LeaderboardStoreTrait};
    use tournaments_leaderboard::libs::leaderboard::leaderboard::{LeaderboardResult};

    use dojo::contract::components::world_provider::{IWorldProvider};

    use starknet::{ContractAddress, get_block_timestamp, get_contract_address, get_caller_address};

    use openzeppelin_introspection::interface::{ISRC5Dispatcher, ISRC5DispatcherTrait};
    use openzeppelin_token::erc20::interface::{
        IERC20Dispatcher, IERC20DispatcherTrait, IERC20MetadataDispatcher,
        IERC20MetadataDispatcherTrait,
    };
    use openzeppelin_token::erc721::interface::{
        IERC721Dispatcher, IERC721DispatcherTrait, IERC721MetadataDispatcher,
        IERC721MetadataDispatcherTrait, IERC721_ID,
    };

    // uses dojo world storage
    #[storage]
    pub struct Storage {}

    // uses dojo world events
    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {}

    #[embeddable_as(TournamentImpl)]
    impl Tournament<
        TContractState,
        +HasComponent<TContractState>,
        +IWorldProvider<TContractState>,
        +Drop<TContractState>,
    > of ITournament<ComponentState<TContractState>> {
        fn total_tournaments(self: @ComponentState<TContractState>) -> u64 {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), @DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_platform_metrics().total_tournaments
        }
        fn tournament(
            self: @ComponentState<TContractState>, tournament_id: u64,
        ) -> TournamentModel {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), @DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_tournament(tournament_id)
        }
        fn get_registration(
            self: @ComponentState<TContractState>, game_address: ContractAddress, token_id: u64,
        ) -> Registration {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), @DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_registration(game_address, token_id)
        }
        fn tournament_entries(self: @ComponentState<TContractState>, tournament_id: u64) -> u32 {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), @DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_tournament_entry_count(tournament_id).count
        }

        fn is_token_registered(
            self: @ComponentState<TContractState>, address: ContractAddress,
        ) -> bool {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), @DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            let token = store.get_token(address);
            self._is_token_registered(@token)
        }

        fn register_token(
            ref self: ComponentState<TContractState>,
            address: ContractAddress,
            token_type: TokenType,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), @DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let safe_mode = store.get_tournament_config(VERSION).safe_mode;
            let token_model = store.get_token(address);
            assert!(!safe_mode, "Tournament: Cannot register token as safe mode is enabled");
            self._assert_token_registered(token_model);
            let (name, symbol) = self._register_token(address, token_type);
            let token_model = Token { address, name, symbol, token_type, is_registered: true };
            store.set_token(@token_model);
        }

        fn get_leaderboard(
            self: @ComponentState<TContractState>, tournament_id: u64,
        ) -> Array<u64> {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), @DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_leaderboard(tournament_id)
        }

        fn current_phase(self: @ComponentState<TContractState>, tournament_id: u64) -> Phase {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), @DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            let tournament = store.get_tournament(tournament_id);
            tournament.schedule.current_phase(get_block_timestamp())
        }

        fn get_tournament_id_for_token_id(
            self: @ComponentState<TContractState>, game_address: ContractAddress, token_id: u64,
        ) -> u64 {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), @DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_registration(game_address, token_id).tournament_id
        }

        fn get_prize(self: @ComponentState<TContractState>, prize_id: u64) -> Prize {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), @DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_prize(prize_id)
        }

        /// @title Create tournament
        /// @notice Allows anyone to create a tournament.
        /// @param self A reference to the ContractState object.
        /// @param creator_rewards_address the address to mint the creator's game token to.
        /// @param metadata the tournament metadata.
        /// @param schedule the tournament schedule.
        /// @param game_config the tournament game configuration.
        /// @param entry_fee and optional entry fee for the tournament.
        /// @param entry_requirement and optional entry requirement.
        /// @return A tuple containing the tournament and the creator's game token id.
        fn create_tournament(
            ref self: ComponentState<TContractState>,
            creator_rewards_address: ContractAddress,
            metadata: Metadata,
            schedule: Schedule,
            game_config: GameConfig,
            entry_fee: Option<EntryFee>,
            entry_requirement: Option<EntryRequirement>,
        ) -> TournamentModel {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), @DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);

            schedule.assert_is_valid();
            self._assert_valid_game_config(game_config);

            if let Option::Some(entry_fee) = entry_fee {
                self._assert_valid_entry_fee(store, entry_fee, game_config.prize_spots);
            }

            if let Option::Some(entry_requirement) = entry_requirement {
                self._assert_valid_entry_requirement(store, entry_requirement);
            }

            // mint a game to the tournament creator for reward distribution
            let creator_token_id = self
                ._mint_game(
                    game_config.address,
                    game_config.settings_id,
                    schedule,
                    metadata.name,
                    creator_rewards_address,
                );

            store
                .create_tournament(
                    creator_token_id, metadata, schedule, game_config, entry_fee, entry_requirement,
                )
        }

        /// @title Enter tournament
        /// @notice Allows a player to enter a tournament for a particular tournament id.
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        /// @param player_name A felt252 representing the name of the player.
        /// @param player_address A ContractAddress which the game token will be minted to.
        /// @param qualifying_token_id A Option<QualificationProof> representing the token id of the
        /// qualifying token.
        /// @return A tuple containing the tournament token id and the entry number.
        fn enter_tournament(
            ref self: ComponentState<TContractState>,
            tournament_id: u64,
            player_name: felt252,
            player_address: ContractAddress,
            qualification: Option<QualificationProof>,
        ) -> (u64, u32) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), @DEFAULT_NS(),
            );

            let mut store: Store = StoreTrait::new(world);

            let tournament = store.get_tournament(tournament_id);

            self._assert_tournament_exists(store, tournament_id);

            tournament.schedule.assert_registration_open(get_block_timestamp());

            // Determine the actual recipient based on entry requirements and qualification
            let mint_to_address = if let Option::Some(entry_requirement) = tournament
                .entry_requirement {
                let recipient = self
                    ._process_entry_requirement(
                        ref store, tournament_id, entry_requirement, player_address, qualification,
                    );
                recipient
            } else {
                player_address
            };

            if let Option::Some(entry_fee) = tournament.entry_fee {
                self._process_entry_fee(entry_fee);
            }

            // mint game to the determined recipient
            let game_token_id = self
                ._mint_game(
                    tournament.game_config.address,
                    tournament.game_config.settings_id,
                    tournament.schedule,
                    player_name,
                    mint_to_address,
                );

            let entry_number = store.increment_and_get_tournament_entry_count(tournament_id);

            // associate game token with tournament via registration
            store
                .set_registration(
                    @Registration {
                        game_token_id,
                        game_address: tournament.game_config.address,
                        tournament_id,
                        entry_number,
                        has_submitted: false,
                    },
                );

            // return game token id and entry number
            (game_token_id, entry_number)
        }

        /// @title Submit score
        /// @notice Allows a player to submit a score for a tournament
        /// @dev This function uses a 1-based index for the position parameter. Input 1 for first
        /// place, 2 for second, etc.
        /// @dev This function is permissionless, allowing anyone to submit a valid score for a
        /// tournament.
        /// @dev When tournament enters submission, save gas by multi-calling this with scores
        /// starting from first and going to last place.
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        /// @param token_id A u64 representing the unique ID of the game token.
        /// @param position A u8 representing the position on the leaderboard.
        fn submit_score(
            ref self: ComponentState<TContractState>,
            tournament_id: u64,
            token_id: u64,
            position: u8,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), @DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);

            // assert tournament exists
            self._assert_tournament_exists(store, tournament_id);

            // get tournament
            let tournament = store.get_tournament(tournament_id);

            // Validate submission phase
            let schedule = tournament.schedule;
            assert!(
                schedule.current_phase(get_block_timestamp()) == Phase::Submission,
                "Tournament: Not in submission period",
            );

            // get registration details for provided game token
            let registration = store.get_registration(tournament.game_config.address, token_id);

            // Validate provided token is registered for the specified tournament
            assert!(
                registration.tournament_id == tournament.id,
                "Tournament: Token not registered for tournament",
            );

            // Score can only be submitted once
            assert!(!registration.has_submitted, "Tournament: Score already submitted");

            // get score for token id
            let submitted_score = self
                .get_score_for_token_id(tournament.game_config.address, token_id);

            // Submit score through leaderboard store helpers
            let submit_result = store
                .submit_score_to_leaderboard(tournament_id, token_id, submitted_score, position);

            match submit_result {
                LeaderboardResult::Success => { // Score successfully submitted, registration already marked as submitted
                },
                LeaderboardResult::InvalidPosition => panic!("Tournament: Invalid position"),
                LeaderboardResult::LeaderboardFull => panic!("Tournament: Leaderboard is full"),
                LeaderboardResult::ScoreTooLow => panic!("Tournament: Score too low for position"),
                LeaderboardResult::ScoreTooHigh => panic!(
                    "Tournament: Score qualifies for higher position",
                ),
                LeaderboardResult::DuplicateEntry => panic!("Tournament: Score already submitted"),
                LeaderboardResult::InvalidConfig => panic!("Tournament: Invalid configuration"),
            }
        }

        /// @title Claim prize
        /// @notice Allows anyone to claim a prize for a tournament for a particular tournament id.
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        /// @param prize_type A PrizeType representing the type of prize to claim.
        fn claim_prize(
            ref self: ComponentState<TContractState>, tournament_id: u64, prize_type: PrizeType,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), @DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let tournament = store.get_tournament(tournament_id);

            // assert tournament exists
            self._assert_tournament_exists(store, tournament_id);

            tournament.schedule.assert_tournament_is_finalized(get_block_timestamp());

            self._assert_prize_not_claimed(store, tournament_id, prize_type);

            match prize_type {
                PrizeType::EntryFees(role) => {
                    self._claim_entry_fees(store, tournament_id, tournament, role);
                },
                PrizeType::Sponsored(prize_id) => {
                    self._claim_sponsored_prize(store, tournament_id, tournament, prize_id);
                },
            }

            store.set_prize_claim(@PrizeClaim { tournament_id, prize_type, claimed: true });
        }

        /// @title Add prize
        /// @notice Allows anyone to add a prize for a tournament for a particular tournament id.
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        /// @param token A contract address representing the token to add as a prize.
        /// @param token_type A TokenType representing the type of token to add as a prize.
        /// @param position A u8 representing the scoreboard position to distribute the prize to.
        /// @return A u64 representing the unique ID of the prize.
        fn add_prize(
            ref self: ComponentState<TContractState>,
            tournament_id: u64,
            token_address: ContractAddress,
            token_type: TokenType,
            position: u8,
        ) -> u64 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), @DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);

            // assert tournament exists
            self._assert_tournament_exists(store, tournament_id);

            tournament.schedule.game.assert_is_active(get_block_timestamp());
            self._assert_prize_token_registered(@store.get_token(token_address));
            self._assert_position_on_leaderboard(tournament.game_config.prize_spots, position);

            self._deposit_prize(tournament_id, token_address, token_type, position);

            // get next prize id (updates prize count)
            let id = store.increment_and_get_prize_count();

            // create and save new prize
            store
                .set_prize(
                    @Prize {
                        id,
                        tournament_id,
                        token_address,
                        token_type,
                        payout_position: position,
                        sponsor_address: get_caller_address(),
                    },
                );

            id
        }
    }


    #[generate_trait]
    pub impl InternalImpl<
        TContractState,
        +HasComponent<TContractState>,
        +IWorldProvider<TContractState>,
        +Drop<TContractState>,
    > of InternalTrait<TContractState> {
        //
        // INITIALIZE COMPONENT
        //

        /// @title Initialize tournament
        /// @notice Initializes the tournament component for storing its config.
        /// @param self A copy to the ContractState object.
        /// @param name A byte array representing the name of the tournament.
        /// @param symbol A byte array representing the symbol of the tournament.
        /// @param base_uri A byte array representing the base uri of the tournament.
        /// @param safe_mode A bool representing whether to use safe mode.
        /// @param test_mode A bool representing whether to use test mode.
        fn initialize(ref self: ComponentState<TContractState>, safe_mode: bool, test_mode: bool) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), @DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            // Store the config
            store.set_tournament_config(@TournamentConfig { key: VERSION, safe_mode, test_mode });
        }

        //
        // INITIALIZE TOKENS
        //

        /// @title Initialize erc20
        /// @notice Initializes an erc20 token for registration.
        /// @param self A copy to the ContractState object.
        /// @param token A contract address representing the token.
        /// @param name A byte array representing the name of the token.
        /// @param symbol A byte array representing the symbol of the token.
        fn initialize_erc20(
            self: @ComponentState<TContractState>,
            address: ContractAddress,
            name: ByteArray,
            symbol: ByteArray,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), @DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);

            let token_model = store.get_token(address);
            self._assert_token_registered(token_model);

            let token_type = TokenType::erc20(ERC20Data { amount: 1 });
            let new_erc20_token = @Token { address, name, symbol, token_type, is_registered: true };
            store.set_token(new_erc20_token);
        }

        /// @title Initialize erc721
        /// @notice Initializes an erc721 token for registration.
        /// @param self A copy to the ContractState object.
        /// @param token A contract address representing the token.
        /// @param name A byte array representing the name of the token.
        /// @param symbol A byte array representing the symbol of the token.
        fn initialize_erc721(
            self: @ComponentState<TContractState>,
            address: ContractAddress,
            name: ByteArray,
            symbol: ByteArray,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), @DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let token_model = store.get_token(address);
            self._assert_token_registered(token_model);

            let token_type = TokenType::erc721(ERC721Data { id: 1 });
            let new_erc721_token = @Token {
                address, name, symbol, token_type, is_registered: true,
            };
            store.set_token(new_erc721_token);
        }

        //
        // GETTERS
        //

        #[inline(always)]
        fn get_score_for_token_id(
            self: @ComponentState<TContractState>, contract_address: ContractAddress, token_id: u64,
        ) -> u32 {
            let game_dispatcher = IGameDetailsDispatcher { contract_address };
            game_dispatcher.score(token_id)
        }

        #[inline(always)]
        fn _get_owner(
            self: @ComponentState<TContractState>,
            contract_address: ContractAddress,
            token_id: u256,
        ) -> ContractAddress {
            IERC721Dispatcher { contract_address }.owner_of(token_id)
        }

        #[inline(always)]
        fn _is_token_registered(self: @ComponentState<TContractState>, token: @Token) -> bool {
            let chain_id = starknet::get_tx_info().unbox().chain_id;
            if chain_id == SEPOLIA_CHAIN_ID {
                true
            } else {
                *token.is_registered
            }
        }

        // Use leaderboard store helper to check if a score qualifies as a top score
        fn _is_top_score(
            self: @ComponentState<TContractState>, tournament_id: u64, score: u32,
        ) -> bool {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), @DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.qualifies_for_leaderboard(tournament_id, score)
        }

        //
        // ASSERTIONS
        //

        #[inline(always)]
        fn _assert_token_registered(self: @ComponentState<TContractState>, token: Token) {
            let token_address: felt252 = token.address.into();
            assert!(
                !self._is_token_registered(@token),
                "Tournament: Token address {} is already registered",
                token_address,
            );
        }

        #[inline(always)]
        fn _assert_valid_entry_requirement(
            self: @ComponentState<TContractState>,
            store: Store,
            entry_requirement: EntryRequirement,
        ) {
            self._assert_gated_type_validates(store, entry_requirement);
        }

        #[inline(always)]
        fn _assert_valid_entry_fee(
            self: @ComponentState<TContractState>,
            store: Store,
            entry_fee: EntryFee,
            prize_spots: u8,
        ) {
            self._assert_entry_fee_token_registered(@store.get_token(entry_fee.token_address));
            self._assert_valid_payout_distribution(entry_fee, prize_spots);
        }

        #[inline(always)]
        fn _assert_valid_game_config(
            self: @ComponentState<TContractState>, game_config: GameConfig,
        ) {
            let contract_address = game_config.address;

            self._assert_winners_count_greater_than_zero(game_config.prize_spots);
            self._assert_settings_exists(contract_address, game_config.settings_id);

            let src5_dispatcher = ISRC5Dispatcher { contract_address };
            self._assert_supports_game_interface(src5_dispatcher, contract_address);
            self._assert_supports_game_metadata_interface(src5_dispatcher, contract_address);
            self._assert_game_supports_erc721_interface(src5_dispatcher, contract_address);
        }

        #[inline(always)]
        fn _assert_winners_count_greater_than_zero(
            self: @ComponentState<TContractState>, prize_spots: u8,
        ) {
            assert!(prize_spots > 0, "Tournament: Winners count must be greater than zero");
        }

        fn _assert_valid_payout_distribution(
            self: @ComponentState<TContractState>, entry_fee: EntryFee, prize_spots: u8,
        ) {
            // verify distribution length matches prize spots
            self
                ._assert_entry_fee_token_distribution_length_not_too_long(
                    entry_fee.distribution.len(), prize_spots.into(),
                );

            // check the sum of distributions is equal to 100%
            let mut distribution_sum: u8 = 0;
            let mut distribution_index: u32 = 0;
            loop {
                if distribution_index == entry_fee.distribution.len() {
                    break;
                }
                let distribution = *entry_fee.distribution.at(distribution_index);
                distribution_sum += distribution;
                distribution_index += 1;
            };

            if let Option::Some(host_share) = entry_fee.tournament_creator_share {
                distribution_sum += host_share;
            }

            if let Option::Some(creator_share) = entry_fee.game_creator_share {
                distribution_sum += creator_share;
            }

            assert!(
                distribution_sum == 100,
                "Tournament: Entry fee distribution needs to be 100%. Distribution: {}%",
                distribution_sum,
            );
        }

        #[inline(always)]
        fn _assert_supports_game_interface(
            self: @ComponentState<TContractState>,
            src5_dispatcher: ISRC5Dispatcher,
            address: ContractAddress,
        ) {
            let address: felt252 = address.into();
            assert!(
                src5_dispatcher.supports_interface(IGAMETOKEN_ID),
                "Tournament: Game address {} does not support IGame interface",
                address,
            );
        }

        #[inline(always)]
        fn _assert_supports_game_metadata_interface(
            self: @ComponentState<TContractState>,
            src5_dispatcher: ISRC5Dispatcher,
            address: ContractAddress,
        ) {
            let address_felt: felt252 = address.into();
            assert!(
                src5_dispatcher.supports_interface(IGAME_METADATA_ID),
                "Tournament: Game address {} does not support IGameMetadata interface",
                address_felt,
            );
        }

        #[inline(always)]
        fn _assert_game_supports_erc721_interface(
            self: @ComponentState<TContractState>,
            src5_dispatcher: ISRC5Dispatcher,
            address: ContractAddress,
        ) {
            let address_felt: felt252 = address.into();
            assert!(
                src5_dispatcher.supports_interface(IERC721_ID),
                "Tournament: Game address {} does not support IERC721 interface",
                address_felt,
            );
        }

        #[inline(always)]
        fn _assert_settings_exists(
            self: @ComponentState<TContractState>, game: ContractAddress, settings_id: u32,
        ) {
            let settings_dispatcher = ISettingsDispatcher { contract_address: game };
            let settings_exist = settings_dispatcher.setting_exists(settings_id);
            let game_address: felt252 = game.into();
            assert!(
                settings_exist,
                "Tournament: Settings id {} is not found on game address {}",
                settings_id,
                game_address,
            );
        }

        #[inline(always)]
        fn _assert_entry_fee_token_registered(
            self: @ComponentState<TContractState>, token: @Token,
        ) {
            assert!(
                self._is_token_registered(token), "Tournament: Entry fee token is not registered",
            );
        }

        #[inline(always)]
        fn _assert_entry_fee_token_distribution_length_not_too_long(
            self: @ComponentState<TContractState>, distribution_length: u32, prize_spots: u32,
        ) {
            assert!(
                distribution_length <= prize_spots,
                "Tournament: Entry fee distribution length {} is longer than prize spots {}",
                distribution_length,
                prize_spots,
            );
        }

        #[inline(always)]
        fn _assert_entry_fee_token_distribution_sum_is_100(
            self: @ComponentState<TContractState>,
            player_percentage: u8,
            tournament_creator_share: u8,
            game_creator_share: u8,
        ) {
            assert!(
                player_percentage + tournament_creator_share + game_creator_share == 100,
                "Tournament: Entry fee distribution is not 100%. Player percentage: {}%, Tournament creator share: {}%, Game creator share: {}%",
                player_percentage,
                tournament_creator_share,
                game_creator_share,
            );
        }

        #[inline(always)]
        fn _assert_prize_token_registered(self: @ComponentState<TContractState>, token: @Token) {
            assert!(self._is_token_registered(token), "Tournament: Prize token is not registered");
        }


        #[inline(always)]
        fn _assert_scores_count_valid(
            self: @ComponentState<TContractState>, prize_spots: u8, scores_count: u32,
        ) {
            assert!(
                scores_count <= prize_spots.into(),
                "Tournament: The length of scores submissions {} is greater than the winners count {}",
                scores_count,
                prize_spots,
            );
        }

        #[inline(always)]
        fn _assert_position_on_leaderboard(
            self: @ComponentState<TContractState>, prize_spots: u8, position: u8,
        ) {
            assert!(
                position <= prize_spots,
                "Tournament: Prize position {} is greater than the winners count {}",
                position,
                prize_spots,
            );
        }

        #[inline(always)]
        fn _assert_prize_exists(
            self: @ComponentState<TContractState>, token: ContractAddress, id: u64,
        ) {
            assert!(!token.is_zero(), "Tournament: Prize key {} does not exist", id);
        }

        #[inline(always)]
        fn _assert_prize_not_claimed(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_id: u64,
            prize_type: PrizeType,
        ) {
            let prize_claim = store.get_prize_claim(tournament_id, prize_type);
            assert!(!prize_claim.claimed, "Tournament: Prize has already been claimed");
        }

        #[inline(always)]
        fn _assert_payout_is_top_score(
            self: @ComponentState<TContractState>, payout_position: u8, winner_token_ids: Span<u64>,
        ) {
            assert!(
                payout_position.into() <= winner_token_ids.len(),
                "Tournament: Prize payout position {} is not a top score",
                payout_position,
            );
        }

        #[inline(always)]
        fn _assert_payout_is_not_top_score(
            self: @ComponentState<TContractState>, payout_position: u8, winner_token_ids: Span<u64>,
        ) {
            assert!(
                payout_position.into() > winner_token_ids.len(),
                "Tournament: Prize payout position {} is a top score",
                payout_position,
            );
        }


        #[inline(always)]
        fn _assert_under_entry_limit(
            self: @ComponentState<TContractState>,
            tournament_id: u64,
            current_entries: u8,
            entry_limit: u8,
        ) {
            assert!(
                current_entries < entry_limit,
                "Tournament: Maximum qualified entries reached for tournament {}",
                tournament_id,
            );
        }


        fn _assert_gated_type_validates(
            self: @ComponentState<TContractState>,
            store: Store,
            entry_requirement: EntryRequirement,
        ) {
            match entry_requirement.entry_requirement_type {
                EntryRequirementType::token(token) => {
                    let token_model = store.get_token(token);
                    let token_address: felt252 = token.into();
                    assert!(
                        self._is_token_registered(@token_model),
                        "Tournament: Gated token address {} is not registered",
                        token_address,
                    )
                },
                EntryRequirementType::tournament(tournament_type) => {
                    match tournament_type {
                        TournamentType::winners(tournament_ids) => {
                            let mut index = 0;
                            loop {
                                if index == tournament_ids.len() {
                                    break;
                                }
                                self._assert_tournament_exists(store, *tournament_ids.at(index));
                                index += 1;
                            }
                        },
                        TournamentType::participants(tournament_ids) => {
                            let mut index = 0;
                            loop {
                                if index == tournament_ids.len() {
                                    break;
                                }
                                self._assert_tournament_exists(store, *tournament_ids.at(index));
                                index += 1;
                            }
                        },
                    }
                },
                EntryRequirementType::allowlist(_) => {},
            }
        }


        fn _assert_tournament_exists(
            self: @ComponentState<TContractState>, store: Store, tournament_id: u64,
        ) {
            assert!(
                tournament_id <= store.get_tournament_count(),
                "Tournament: Tournament {} does not exist",
                tournament_id,
            );
        }

        #[inline(always)]
        fn _validate_tournament_eligibility(
            self: @ComponentState<TContractState>,
            tournament_type: TournamentType,
            tournament_id: u64,
        ) {
            let (qualifying_tournaments, _) = match tournament_type {
                TournamentType::winners(tournaments) => (tournaments, true),
                TournamentType::participants(tournaments) => (tournaments, false),
            };

            assert!(
                self._is_qualifying_tournament(qualifying_tournaments, tournament_id),
                "Tournament: Not a qualifying tournament",
            );
        }

        fn _validate_position_requirements(
            self: @ComponentState<TContractState>,
            leaderboard: Span<u64>,
            tournament_type: TournamentType,
            qualification: TournamentQualification,
        ) {
            // Position must be greater than 0 for all tournament types
            assert!(qualification.position > 0, "Tournament: Position must be greater than 0");

            if let TournamentType::winners(_) = tournament_type {
                assert!(
                    qualification.position.into() <= leaderboard.len(),
                    "Tournament: Position {} exceeds leaderboard length {}",
                    qualification.position,
                    leaderboard.len(),
                );

                assert!(
                    *leaderboard.at((qualification.position - 1).into()) == qualification.token_id,
                    "Tournament: Provided Token ID {} does not match Token ID {} at leaderboard position {} for tournament {}",
                    qualification.token_id,
                    qualification.token_id,
                    qualification.position,
                    qualification.tournament_id,
                );
            }
        }

        fn _has_qualified_in_tournaments(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_type: TournamentType,
            token_id: u64,
        ) -> bool {
            let (tournament_ids, requires_top_score) = match tournament_type {
                TournamentType::winners(ids) => (ids, true),
                TournamentType::participants(ids) => (ids, false),
            };

            let mut loop_index = 0;
            let mut is_qualified = false;

            loop {
                if loop_index == tournament_ids.len() {
                    break;
                }

                let tournament_id = *tournament_ids.at(loop_index);
                let tournament = store.get_tournament(tournament_id);
                let game_address = tournament.game_config.address;
                let registration = store.get_registration(game_address, token_id);
                let owner = self._get_owner(game_address, token_id.into());

                if owner == get_caller_address()
                    && registration.tournament_id == tournament.id
                    && registration.entry_number != 0
                    && registration.has_submitted {
                    if requires_top_score {
                        // Use leaderboard store helper to check if the token is a top score
                        is_qualified = self
                            ._is_top_score(
                                tournament_id, self.get_score_for_token_id(game_address, token_id),
                            );
                    } else {
                        is_qualified = true;
                    }

                    if is_qualified {
                        break;
                    }
                }

                loop_index += 1;
            };

            is_qualified
        }

        #[inline(always)]
        fn _assert_has_qualified_in_tournaments(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_type: TournamentType,
            token_id: u64,
        ) {
            assert!(
                self._has_qualified_in_tournaments(store, tournament_type, token_id),
                "Tournament: game token id {} does not qualify for tournament",
                token_id,
            );
        }


        #[inline(always)]
        fn _assert_position_is_valid(
            self: @ComponentState<TContractState>, position: u8, winner_count: u32,
        ) {
            assert!(
                position > 0 && position.into() <= winner_count, "Tournament: Invalid position",
            );
        }

        //
        // INTERNALS
        //

        // TODO: add for V2 (only ERC721 tokens)
        fn _register_token(
            ref self: ComponentState<TContractState>, token: ContractAddress, token_data: TokenType,
        ) -> (ByteArray, ByteArray) {
            let mut name = "";
            let mut symbol = "";

            match token_data {
                TokenType::erc20(_) => {
                    let token_dispatcher = IERC20Dispatcher { contract_address: token };
                    let token_dispatcher_metadata = IERC20MetadataDispatcher {
                        contract_address: token,
                    };
                    name = token_dispatcher_metadata.name();
                    symbol = token_dispatcher_metadata.symbol();
                    // check that the contract is approved for the minimal amount
                    let allowance = token_dispatcher
                        .allowance(get_caller_address(), get_contract_address());
                    let token_address: felt252 = token.into();
                    assert!(
                        allowance == 1,
                        "Tournament: Token address {} has invalid allowance",
                        token_address,
                    );
                    // take a reading of the current balance (incase contract has assets
                    // already)
                    let current_balance = token_dispatcher.balance_of(get_contract_address());
                    // trnsfer a minimal amount to the contract
                    token_dispatcher.transfer_from(get_caller_address(), get_contract_address(), 1);
                    // take a reading of the new balance
                    let new_balance = token_dispatcher.balance_of(get_contract_address());
                    assert!(
                        new_balance == current_balance + 1,
                        "Tournament: Token address {} has invalid balance",
                        token_address,
                    );
                    // transfer back the minimal amount
                    token_dispatcher.transfer(get_caller_address(), 1);
                    // check the total supply is legitimate
                    let total_supply = token_dispatcher.total_supply();
                    assert!(
                        total_supply < TWO_POW_128.into(),
                        "Tournament: Token address {} has a total supply that is too large",
                        token_address,
                    );
                },
                TokenType::erc721(erc721_token) => {
                    let token_dispatcher = IERC721Dispatcher { contract_address: token };
                    let token_dispatcher_metadata = IERC721MetadataDispatcher {
                        contract_address: token,
                    };
                    name = token_dispatcher_metadata.name();
                    symbol = token_dispatcher_metadata.symbol();
                    // check that the contract is approved for the specific id
                    let approved = token_dispatcher.get_approved(erc721_token.id.into());
                    let token_address: felt252 = token.into();
                    assert!(
                        approved == get_contract_address(),
                        "Tournament: Token address {} has invalid approval",
                        token_address,
                    );
                    // transfer a specific id to the contract
                    token_dispatcher
                        .transfer_from(
                            get_caller_address(), get_contract_address(), erc721_token.id.into(),
                        );
                    // check the balance of the contract
                    let balance = token_dispatcher.balance_of(get_contract_address());
                    assert!(
                        balance == 1,
                        "Tournament: Token address {} has invalid balance",
                        token_address,
                    );
                    let owner = token_dispatcher.owner_of(erc721_token.id.into());
                    assert!(
                        owner == get_contract_address(),
                        "Tournament: Token address {} has invalid owner",
                        token_address,
                    );
                    // transfer back the token
                    token_dispatcher
                        .transfer_from(
                            get_contract_address(), get_caller_address(), erc721_token.id.into(),
                        );
                },
            }
            (name, symbol)
        }

        /// @title mint_game
        /// @notice Mints a new game token to the provided player address.
        /// @param game_address The address of the game contract.
        /// @param settings_id The id of the game settings.
        /// @param game_schedule The schedule of the game.
        /// @param player_name The name of the player.
        /// @param to_address The address to mint the game token to.
        /// @return The game token id.
        fn _mint_game(
            ref self: ComponentState<TContractState>,
            game_address: ContractAddress,
            settings_id: u32,
            game_schedule: Schedule,
            player_name: felt252,
            to_address: ContractAddress,
        ) -> u64 {
            let game_dispatcher = IGameTokenDispatcher { contract_address: game_address };
            game_dispatcher
                .mint(
                    player_name,
                    settings_id,
                    Option::Some(game_schedule.game.start),
                    Option::Some(game_schedule.game.end),
                    to_address,
                )
        }

        #[inline(always)]
        fn _process_entry_fee(ref self: ComponentState<TContractState>, entry_fee: EntryFee) {
            let erc20_dispatcher = IERC20Dispatcher { contract_address: entry_fee.token_address };
            erc20_dispatcher
                .transfer_from(
                    get_caller_address(), get_contract_address(), entry_fee.amount.into(),
                );
        }

        fn _deposit_prize(
            ref self: ComponentState<TContractState>,
            tournament_id: u64,
            token: ContractAddress,
            token_type: TokenType,
            position: u8,
        ) {
            match token_type {
                TokenType::erc20(erc20_token) => {
                    let token_dispatcher = IERC20Dispatcher { contract_address: token };
                    assert!(
                        erc20_token.amount > 0,
                        "Tournament: ERC20 prize token amount must be greater than 0",
                    );
                    token_dispatcher
                        .transfer_from(
                            get_caller_address(), get_contract_address(), erc20_token.amount.into(),
                        );
                },
                TokenType::erc721(erc721_token) => {
                    let token_dispatcher = IERC721Dispatcher { contract_address: token };
                    token_dispatcher
                        .transfer_from(
                            get_caller_address(), get_contract_address(), erc721_token.id.into(),
                        );
                },
            }
        }

        #[inline(always)]
        fn _calculate_payout(
            ref self: ComponentState<TContractState>, bp: u128, total_value: u128,
        ) -> u128 {
            (bp * total_value) / 100
        }

        #[inline(always)]
        fn _get_game_creator_address(
            self: @ComponentState<TContractState>, game_address: ContractAddress,
        ) -> ContractAddress {
            // Game creator is the owner of token ID 0
            let game_dispatcher = IERC721Dispatcher { contract_address: game_address };
            game_dispatcher.owner_of(0)
        }

        fn _claim_entry_fees(
            ref self: ComponentState<TContractState>,
            store: Store,
            tournament_id: u64,
            tournament: TournamentModel,
            role: Role,
        ) {
            if let Option::Some(entry_fee) = tournament.entry_fee {
                let total_entries = store.get_tournament_entry_count(tournament_id).count;
                let total_pool = total_entries.into() * entry_fee.amount;

                // Calculate share based on recipient type
                let share = match role {
                    Role::TournamentCreator => {
                        if let Option::Some(tournament_creator_share) = entry_fee
                            .tournament_creator_share {
                            tournament_creator_share
                        } else {
                            panic!(
                                "Tournament: tournament {} does not have a host tip", tournament_id,
                            )
                        }
                    },
                    Role::GameCreator => {
                        if let Option::Some(game_creator_share) = entry_fee.game_creator_share {
                            game_creator_share
                        } else {
                            panic!(
                                "Tournament: tournament {} does not have a game creator tip",
                                tournament_id,
                            )
                        }
                    },
                    Role::Position(position) => {
                        self
                            ._assert_position_is_valid(
                                position, tournament.game_config.prize_spots.into(),
                            );
                        *entry_fee.distribution.at(position.into() - 1)
                    },
                };

                let prize_amount = self._calculate_payout(share.into(), total_pool);

                // Get recipient address using leaderboard from store
                let recipient_address = match role {
                    Role::TournamentCreator => {
                        // tournament creator is owner of the tournament creator token
                        self
                            ._get_owner(
                                tournament.game_config.address, tournament.creator_token_id.into(),
                            )
                    },
                    Role::GameCreator => {
                        // game creator is owner of token id 0 of the game contract
                        self
                            ._get_owner(
                                tournament.game_config.address, GAME_CREATOR_TOKEN_ID.into(),
                            )
                    },
                    Role::Position(position) => {
                        // Get leaderboard from store
                        let leaderboard = store.get_leaderboard(tournament_id);
                        // Check if leaderboard has enough entries for the position
                        if position.into() <= leaderboard.len() {
                            let winner_token_id = *leaderboard.at(position.into() - 1);
                            self._get_owner(tournament.game_config.address, winner_token_id.into())
                        } else {
                            // No entry at this position, default to tournament creator
                            self
                                ._get_owner(
                                    tournament.game_config.address,
                                    tournament.creator_token_id.into(),
                                )
                        }
                    },
                };

                if prize_amount > 0 {
                    let erc20_dispatcher = IERC20Dispatcher {
                        contract_address: entry_fee.token_address,
                    };
                    erc20_dispatcher.transfer(recipient_address, prize_amount.into());
                }
            } else {
                panic!("Tournament: tournament {} has no entry fees", tournament_id);
            }
        }

        fn _claim_sponsored_prize(
            ref self: ComponentState<TContractState>,
            store: Store,
            tournament_id: u64,
            tournament: TournamentModel,
            prize_id: u64,
        ) {
            let prize = store.get_prize(prize_id);

            // Validate prize
            assert!(
                prize.tournament_id == tournament_id,
                "Tournament: Prize {} is for tournament {}",
                prize_id,
                prize.tournament_id,
            );

            // Get winner address using leaderboard from store
            let leaderboard = store.get_leaderboard(tournament_id);
            self
                ._assert_position_is_valid(
                    prize.payout_position, tournament.game_config.prize_spots.into(),
                );

            // Check if leaderboard has enough entries for the position
            let recipient_address = if prize.payout_position.into() <= leaderboard.len() {
                let winner_token_id = *leaderboard.at(prize.payout_position.into() - 1);
                self._get_owner(tournament.game_config.address, winner_token_id.into())
            } else {
                // No entry at this position, default to tournament creator
                self._get_owner(tournament.game_config.address, tournament.creator_token_id.into())
            };

            // Transfer prize
            match prize.token_type {
                TokenType::erc20(erc20_token) => {
                    let erc20 = IERC20Dispatcher { contract_address: prize.token_address };
                    erc20.transfer(recipient_address, erc20_token.amount.into());
                },
                TokenType::erc721(erc721_token) => {
                    let erc721 = IERC721Dispatcher { contract_address: prize.token_address };
                    erc721
                        .transfer_from(
                            get_contract_address(), recipient_address, erc721_token.id.into(),
                        );
                },
            };
        }

        fn _process_entry_requirement(
            self: @ComponentState<TContractState>,
            ref store: Store,
            tournament_id: u64,
            entry_requirement: EntryRequirement,
            player_address: ContractAddress,
            qualifier: Option<QualificationProof>,
        ) -> ContractAddress {
            // Require qualifier for all entry requirements
            let qualifier = match qualifier {
                Option::Some(q) => q,
                Option::None => {
                    panic!(
                        "Tournament: Tournament {} has an entry requirement but no qualification was provided",
                        tournament_id,
                    )
                },
            };

            let recipient = self
                ._validate_entry_requirement(
                    store, tournament_id, entry_requirement, player_address, qualifier,
                );

            // if entry limit was specified
            if entry_requirement.entry_limit != 0 {
                // check and update limit requirements
                self
                    ._update_qualification_entries(
                        ref store, tournament_id, qualifier, entry_requirement.entry_limit,
                    );
            }

            recipient
        }

        fn _update_qualification_entries(
            self: @ComponentState<TContractState>,
            ref store: Store,
            tournament_id: u64,
            qualifier: QualificationProof,
            entry_limit: u8,
        ) {
            let mut qualification_entries = store
                .get_qualification_entries(tournament_id, qualifier);

            self
                ._assert_under_entry_limit(
                    tournament_id, qualification_entries.entry_count, entry_limit,
                );

            qualification_entries.entry_count += 1;

            store.set_qualification_entries(@qualification_entries);
        }

        fn _validate_entry_requirement(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_id: u64,
            entry_requirement: EntryRequirement,
            player_address: ContractAddress,
            qualifier: QualificationProof,
        ) -> ContractAddress {
            match entry_requirement.entry_requirement_type {
                EntryRequirementType::tournament(tournament_type) => {
                    self
                        ._validate_tournament_qualification(
                            store, tournament_id, tournament_type, qualifier, player_address,
                        )
                },
                EntryRequirementType::token(token_address) => {
                    self._validate_nft_qualification(token_address, player_address, qualifier)
                },
                EntryRequirementType::allowlist(addresses) => {
                    self._validate_allowlist_qualification(addresses, qualifier)
                },
            }
        }

        fn _validate_tournament_qualification(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_id: u64,
            tournament_type: TournamentType,
            qualifier: QualificationProof,
            player_address: ContractAddress,
        ) -> ContractAddress {
            let qualifying_proof_tournament = match qualifier {
                QualificationProof::Tournament(qual) => qual,
                _ => panic!("Tournament: Provided qualification proof is not of type 'Tournament'"),
            };

            // verify qualifying tournament is in qualifying set
            self
                ._validate_tournament_eligibility(
                    tournament_type, qualifying_proof_tournament.tournament_id,
                );

            // verify qualifying tournament is finalized
            let qualifying_tournament = store
                .get_tournament(qualifying_proof_tournament.tournament_id);

            qualifying_tournament.schedule.assert_tournament_is_finalized(get_block_timestamp());

            // verify position requirements using leaderboard from store
            let leaderboard = store.get_leaderboard(qualifying_proof_tournament.tournament_id);
            self
                ._validate_position_requirements(
                    leaderboard.span(), tournament_type, qualifying_proof_tournament,
                );

            // Return the owner of the qualifying token
            let token_owner = self
                ._get_owner(
                    qualifying_tournament.game_config.address,
                    qualifying_proof_tournament.token_id.into(),
                );

            token_owner
        }

        fn _validate_nft_qualification(
            self: @ComponentState<TContractState>,
            token_address: ContractAddress,
            player_address: ContractAddress,
            qualifier: QualificationProof,
        ) -> ContractAddress {
            let qualification = match qualifier {
                QualificationProof::NFT(qual) => qual,
                _ => panic!("Tournament: Provided qualification proof is not of type 'Token'"),
            };

            let erc721_dispatcher = IERC721Dispatcher { contract_address: token_address };
            let token_owner = erc721_dispatcher.owner_of(qualification.token_id);

            // Return the owner of the qualifying NFT
            token_owner
        }

        fn _is_qualifying_tournament(
            self: @ComponentState<TContractState>,
            qualifying_tournaments: Span<u64>,
            tournament_id: u64,
        ) -> bool {
            let mut i = 0;
            loop {
                if i >= qualifying_tournaments.len() {
                    break false;
                }
                if *qualifying_tournaments.at(i) == tournament_id {
                    break true;
                }
                i += 1;
            }
        }

        #[inline(always)]
        fn _validate_allowlist_qualification(
            self: @ComponentState<TContractState>,
            allowlist_addresses: Span<ContractAddress>,
            qualifier: QualificationProof,
        ) -> ContractAddress {
            let qualifying_address = match qualifier {
                QualificationProof::Address(qual) => qual,
                _ => panic!("Tournament: Provided qualification proof is not of type 'Address'"),
            };

            assert!(
                self._contains_address(allowlist_addresses, qualifying_address),
                "Tournament: Qualifying address is not in allowlist",
            );

            // Return the qualifying address - for allowlist, the game is minted to the allowlisted
            // address
            qualifying_address
        }

        fn _contains_address(
            self: @ComponentState<TContractState>,
            addresses: Span<ContractAddress>,
            target: ContractAddress,
        ) -> bool {
            let mut i = 0;
            loop {
                if i >= addresses.len() {
                    break false;
                }
                if *addresses.at(i) == target {
                    break true;
                }
                i += 1;
            }
        }
    }
}
