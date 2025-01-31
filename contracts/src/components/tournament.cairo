// SPDX-License-Identifier: BUSL-1.1

use starknet::ContractAddress;
use tournaments::components::models::tournament::{
    Tournament as TournamentModel, TokenType, Registration, PrizeType, TournamentState, Metadata,
    Schedule, GameConfig, EntryFee, EntryRequirement, QualificationProof,
};

///
/// Interface
///

#[starknet::interface]
trait ITournament<TState> {
    fn create_tournament(
        ref self: TState,
        metadata: Metadata,
        schedule: Schedule,
        game_config: GameConfig,
        entry_fee: Option<EntryFee>,
        entry_requirement: Option<EntryRequirement>,
    ) -> (TournamentModel, u64);
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
    fn get_registration(self: @TState, tournament_id: u64, token_id: u64) -> Registration;
    fn tournament_entries(self: @TState, tournament_id: u64) -> u32;
    fn is_token_registered(self: @TState, address: ContractAddress) -> bool;
    fn register_token(ref self: TState, address: ContractAddress, token_type: TokenType);
    fn get_leaderboard(self: @TState, tournament_id: u64) -> Span<u64>;
    fn get_state(self: @TState, tournament_id: u64) -> TournamentState;
}

///
/// Tournament Component
///

#[starknet::component]
pub mod tournament_component {
    use super::ITournament;

    use core::num::traits::Zero;

    use tournaments::components::constants::{
        TWO_POW_128, MIN_REGISTRATION_PERIOD, MAX_REGISTRATION_PERIOD, MIN_TOURNAMENT_LENGTH,
        MAX_TOURNAMENT_LENGTH, MIN_SUBMISSION_PERIOD, MAX_SUBMISSION_PERIOD, DEFAULT_NS, VERSION,
    };
    use tournaments::components::interfaces::{
        IGameDispatcher, IGameDispatcherTrait, IGAME_ID, IGAME_METADATA_ID,
    };
    use tournaments::components::models::tournament::{
        Tournament as TournamentModel, Registration, Leaderboard, Prize, Token, TournamentConfig,
        TokenType, TournamentType, ERC20Data, ERC721Data, PrizeType, Role, PrizeClaim,
        TournamentState, Metadata, Schedule, GameConfig, EntryFee, EntryRequirement, Period,
        QualificationProof, TournamentQualification,
    };
    use tournaments::components::interfaces::{WorldTrait, WorldImpl};
    use tournaments::components::libs::store::{Store, StoreTrait};

    use dojo::contract::components::world_provider::{IWorldProvider};


    use starknet::{ContractAddress, get_block_timestamp, get_contract_address, get_caller_address};

    use openzeppelin_introspection::{
        src5::SRC5Component, interface::{ISRC5Dispatcher, ISRC5DispatcherTrait},
    };
    use openzeppelin_token::erc20::interface::{
        IERC20Dispatcher, IERC20DispatcherTrait, IERC20MetadataDispatcher,
        IERC20MetadataDispatcherTrait,
    };
    use openzeppelin_token::erc721::interface::{
        IERC721Dispatcher, IERC721DispatcherTrait, IERC721MetadataDispatcher,
        IERC721MetadataDispatcherTrait, IERC721_ID,
    };
    use openzeppelin_token::erc721::{
        ERC721Component, ERC721Component::{InternalImpl as ERC721InternalImpl},
    };

    #[storage]
    pub struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {}

    #[embeddable_as(TournamentImpl)]
    impl Tournament<
        TContractState,
        +HasComponent<TContractState>,
        +IWorldProvider<TContractState>,
        +ERC721Component::ERC721HooksTrait<TContractState>,
        impl ERC721: ERC721Component::HasComponent<TContractState>,
        impl SRC5: SRC5Component::HasComponent<TContractState>,
        +Drop<TContractState>,
    > of ITournament<ComponentState<TContractState>> {
        fn total_tournaments(self: @ComponentState<TContractState>) -> u64 {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_platform_metrics(VERSION).total_tournaments
        }
        fn tournament(
            self: @ComponentState<TContractState>, tournament_id: u64,
        ) -> TournamentModel {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_tournament(tournament_id)
        }
        fn get_registration(
            self: @ComponentState<TContractState>, tournament_id: u64, token_id: u64,
        ) -> Registration {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_registration(tournament_id, token_id)
        }
        fn tournament_entries(self: @ComponentState<TContractState>, tournament_id: u64) -> u32 {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_tournament_entry_count(tournament_id).count
        }

        fn is_token_registered(
            self: @ComponentState<TContractState>, address: ContractAddress,
        ) -> bool {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            let token = store.get_token(address);
            self._is_token_registered(@token)
        }

        // TODO: remove safe mode block for V2 (use Ekubo tokens)
        fn register_token(
            ref self: ComponentState<TContractState>,
            address: ContractAddress,
            token_type: TokenType,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), @"tournament",
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

        fn get_leaderboard(self: @ComponentState<TContractState>, tournament_id: u64) -> Span<u64> {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_leaderboard(tournament_id)
        }

        fn get_state(self: @ComponentState<TContractState>, tournament_id: u64) -> TournamentState {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            let tournament = store.get_tournament(tournament_id);
            self._get_state(@tournament.schedule)
        }

        /// @title Create tournament
        /// @notice Allows anyone to create a tournament.
        /// @param self A reference to the ContractState object.
        /// @param metadata the tournament metadata.
        /// @param schedule the tournament schedule.
        /// @param game_config the tournament game configuration.
        /// @param entry_fee and optional entry fee for the tournament.
        /// @param entry_requirement and optional entry requirement.
        /// @return A tuple containing the tournament and the creator's game token id.
        fn create_tournament(
            ref self: ComponentState<TContractState>,
            metadata: Metadata,
            schedule: Schedule,
            game_config: GameConfig,
            entry_fee: Option<EntryFee>,
            entry_requirement: Option<EntryRequirement>,
        ) -> (TournamentModel, u64) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);

            self._assert_valid_tournament_schedule(schedule);

            self._assert_valid_game_config(game_config);

            // if an entry fee was provided, validate it
            if let Option::Some(entry_fee) = entry_fee {
                self._assert_valid_entry_fee(store, entry_fee, game_config.prize_spots);
            }

            // if any entry requirement was provided, valid it
            if let Option::Some(entry_requirement) = entry_requirement {
                self._assert_valid_entry_requirement(store, entry_requirement);
            }

            // create tournament
            let tournament = store
                .create_tournament(metadata, schedule, game_config, entry_fee, entry_requirement);

            // mint the tournament creator a game token for creator rewards
            let game_token_id = self._mint_creator_game(@tournament);

            // save it as entry #0 so we have a transferrable address for issuing creator rewards
            store
                .set_registration(
                    @Registration {
                        game_token_id,
                        tournament_id: tournament.id,
                        entry_number: 0,
                        has_submitted: false,
                    },
                );

            // return Tournament model and the tournament creators game token id
            (tournament, game_token_id)
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
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let tournament = store.get_tournament(tournament_id);

            // assert registration is open
            self._assert_registration_is_open(tournament_id, @tournament.schedule);

            // if tournament includes an entry requirement, validate player entry
            if let Option::Some(entry_requirement) = tournament.entry_requirement {
                self
                    ._validate_entry_requirement(
                        store, entry_requirement, player_address, qualification,
                    );
            }

            // if tournament includes an entry fee, process fee
            if let Option::Some(entry_fee) = tournament.entry_fee {
                self._process_entry_fee(entry_fee);
            }

            // mint game and send to player
            let game_token_id = self._mint_player_game(@tournament, player_name, player_address);

            // increment and get entry count for the tournament
            let entry_number = store.increment_and_get_tournament_entry_count(tournament_id);

            // attach metadata to the tournament token and save it
            store
                .set_registration(
                    @Registration {
                        game_token_id, tournament_id, entry_number, has_submitted: false,
                    },
                );

            // return tournament token id and entry number
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
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);

            // get current leaderboard
            let current_leaderboard = store.get_leaderboard(tournament_id);

            // validate submission
            self
                ._validate_score_submission(
                    store, tournament_id, token_id, position, current_leaderboard.len(),
                );

            // update leaderboard
            let new_leaderboard = self
                ._update_leaderboard(store, tournament_id, token_id, position, current_leaderboard);

            // save new leaderboard
            store.set_leaderboard(@new_leaderboard);

            // mark score as submitted
            self._mark_score_submitted(ref store, tournament_id, token_id);
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
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let tournament = store.get_tournament(tournament_id);

            self._validate_tournament_finalized(tournament_id, @tournament.schedule);
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
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);

            self._assert_tournament_not_ended(tournament.schedule.game.end, tournament_id);
            self._assert_prize_token_registered(@store.get_token(token_address));
            self._assert_position_on_leaderboard(tournament.game_config.prize_spots, position);

            self._deposit_prize(tournament_id, token_address, token_type, position);

            // get next prize id (updates prize count)
            let id = store.increment_and_get_prize_count();

            // create and save new prize
            store
                .set_prize(
                    @Prize {
                        id, tournament_id, token_address, token_type, payout_position: position,
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
        +ERC721Component::ERC721HooksTrait<TContractState>,
        impl ERC721: ERC721Component::HasComponent<TContractState>,
        impl SRC5: SRC5Component::HasComponent<TContractState>,
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
        fn initialize(
            ref self: ComponentState<TContractState>,
            name: ByteArray,
            symbol: ByteArray,
            base_uri: ByteArray,
            safe_mode: bool,
            test_mode: bool,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            // Store the config
            store.set_tournament_config(@TournamentConfig { key: VERSION, safe_mode, test_mode });

            let mut erc721 = get_dep_component_mut!(ref self, ERC721);
            erc721.initializer(name, symbol, base_uri);
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
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
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
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
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

        fn get_score_for_token_id(
            self: @ComponentState<TContractState>, store: Store, tournament_id: u64, token_id: u64,
        ) -> u64 {
            let tournament = store.get_tournament(tournament_id);
            let game_dispatcher = IGameDispatcher {
                contract_address: tournament.game_config.address,
            };
            game_dispatcher.get_score(token_id)
        }

        fn _get_owner(
            self: @ComponentState<TContractState>,
            contract_address: ContractAddress,
            token_id: u256,
        ) -> ContractAddress {
            IERC721Dispatcher { contract_address }.owner_of(token_id)
        }

        fn _is_token_registered(self: @ComponentState<TContractState>, token: @Token) -> bool {
            *token.is_registered
        }

        // @dev instead of iterating over all scores, we just check if the submitted score is
        // greater than the last place score this works as long as we know the score was submitted
        // before the tournament ended
        fn _is_top_score(
            self: @ComponentState<TContractState>, store: Store, tournament_id: u64, score: u64,
        ) -> bool {
            let leaderboard = store.get_leaderboard(tournament_id);
            let num_scores = leaderboard.len();

            if num_scores == 0 {
                return true;
            }

            let last_place_id = *leaderboard.at(num_scores - 1);
            let last_place_score = self
                .get_score_for_token_id(store, tournament_id, last_place_id.try_into().unwrap());

            score >= last_place_score
        }

        //
        // ASSERTIONS
        //

        fn _assert_token_registered(self: @ComponentState<TContractState>, token: Token) {
            let token_address: felt252 = token.address.into();
            assert!(
                !self._is_token_registered(@token),
                "Tournament: Token address {} is already registered",
                token_address,
            );
        }

        fn _assert_valid_entry_requirement(
            self: @ComponentState<TContractState>,
            store: Store,
            entry_requirement: EntryRequirement,
        ) {
            self._assert_gated_type_validates(store, entry_requirement);
        }

        fn _assert_valid_entry_fee(
            self: @ComponentState<TContractState>,
            store: Store,
            entry_fee: EntryFee,
            prize_spots: u8,
        ) {
            self._assert_entry_fee_token_registered(@store.get_token(entry_fee.token_address));
            self._assert_valid_payout_distribution(entry_fee, prize_spots);
        }

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

        fn _assert_valid_tournament_schedule(
            self: @ComponentState<TContractState>, schedule: Schedule,
        ) {
            self._assert_valid_game_schedule(schedule.game);
            self._assert_valid_submission_duration(schedule.submission_period);
            if let Option::Some(registration_period) = schedule.registration {
                self._assert_valid_registration_schedule(registration_period, schedule.game);
            }
        }

        fn _assert_valid_submission_duration(
            self: @ComponentState<TContractState>, submission_duration: u64,
        ) {
            self._assert_submission_period_larger_than_minimum(submission_duration);
            self._assert_submission_period_less_than_maximum(submission_duration);
        }

        fn _assert_valid_game_schedule(self: @ComponentState<TContractState>, game_period: Period) {
            self._assert_start_time_in_future(game_period.start);
            self._assert_tournament_length_not_too_short(game_period.start, game_period.end);
            self._assert_tournament_length_not_too_long(game_period.start, game_period.end);
        }

        fn _assert_valid_registration_schedule(
            self: @ComponentState<TContractState>, registration_period: Period, game_period: Period,
        ) {
            self._assert_registration_start_time(registration_period.start);
            self._assert_min_registration_period(registration_period);
            self._assert_less_than_max_registration_period(registration_period);
            self
                ._assert_registration_starts_before_tournament(
                    registration_period.start, game_period.start,
                );
            self
                ._assert_registration_ends_before_tournament(
                    registration_period.end, game_period.end,
                );
        }

        fn _assert_start_time_in_future(self: @ComponentState<TContractState>, start_time: u64) {
            assert!(
                start_time >= get_block_timestamp(),
                "Tournament: Start time {} is not in the future.",
                start_time,
            );
        }

        fn _assert_registration_start_time(self: @ComponentState<TContractState>, start_time: u64) {
            assert!(
                start_time >= get_block_timestamp(),
                "Tournament: Registration time {} is not in the future.",
                start_time,
            );
        }

        fn _assert_min_registration_period(self: @ComponentState<TContractState>, period: Period) {
            let registration_duration = period.end - period.start;
            assert!(
                registration_duration >= MIN_REGISTRATION_PERIOD.into(),
                "Tournament: Registration period of {} lower than minimum {}",
                registration_duration,
                MIN_REGISTRATION_PERIOD,
            );
        }

        fn _assert_less_than_max_registration_period(
            self: @ComponentState<TContractState>, period: Period,
        ) {
            let registration_duration = period.end - period.start;
            assert!(
                registration_duration < MAX_REGISTRATION_PERIOD.into(),
                "Tournament: Registration period of {} higher than maximum {}",
                registration_duration,
                MAX_REGISTRATION_PERIOD,
            );
        }

        fn _assert_registration_starts_before_tournament(
            self: @ComponentState<TContractState>, registration_start: u64, tournament_start: u64,
        ) {
            assert!(
                registration_start <= tournament_start,
                "Tournament: Registration start time {} after tournament start time {}",
                registration_start,
                tournament_start,
            );
        }

        fn _assert_registration_ends_before_tournament(
            self: @ComponentState<TContractState>, registration_end: u64, tournament_end: u64,
        ) {
            assert!(
                registration_end <= tournament_end,
                "Tournament: Registration end time {} after tournament end time {}",
                registration_end,
                tournament_end,
            );
        }

        fn _assert_tournament_length_not_too_short(
            self: @ComponentState<TContractState>, start: u64, end: u64,
        ) {
            let tournament_length = end - start;
            assert!(
                tournament_length >= MIN_TOURNAMENT_LENGTH.into(),
                "Tournament: Tournament period of {} lower than minimum {}",
                tournament_length,
                MIN_TOURNAMENT_LENGTH,
            );
        }

        fn _assert_tournament_length_not_too_long(
            self: @ComponentState<TContractState>, start: u64, end: u64,
        ) {
            let tournament_length = end - start;
            assert!(
                tournament_length <= MAX_TOURNAMENT_LENGTH.into(),
                "Tournament: Tournament period of {} higher than maximum {}",
                tournament_length,
                MAX_TOURNAMENT_LENGTH,
            );
        }

        fn _assert_submission_period_larger_than_minimum(
            self: @ComponentState<TContractState>, submission_period: u64,
        ) {
            assert!(
                submission_period >= MIN_SUBMISSION_PERIOD.into(),
                "Tournament: Submission period of {} lower than the minimum {}",
                submission_period,
                MIN_SUBMISSION_PERIOD,
            );
        }

        fn _assert_submission_period_less_than_maximum(
            self: @ComponentState<TContractState>, submission_period: u64,
        ) {
            assert!(
                submission_period <= MAX_SUBMISSION_PERIOD.into(),
                "Tournament: Submission period of {} higher than the maximum {}",
                submission_period,
                MAX_SUBMISSION_PERIOD,
            );
        }

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

        fn _assert_supports_game_interface(
            self: @ComponentState<TContractState>,
            src5_dispatcher: ISRC5Dispatcher,
            address: ContractAddress,
        ) {
            let address: felt252 = address.into();
            assert!(
                src5_dispatcher.supports_interface(IGAME_ID),
                "Tournament: Game address {} does not support IGame interface",
                address,
            );
        }

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

        fn _assert_settings_exists(
            self: @ComponentState<TContractState>, game: ContractAddress, settings_id: u32,
        ) {
            let game_dispatcher = IGameDispatcher { contract_address: game };
            let settings_exist = game_dispatcher.get_settings_details(settings_id).exists;
            let game_address: felt252 = game.into();
            assert!(
                settings_exist,
                "Tournament: Settings id {} is not found on game address {}",
                settings_id,
                game_address,
            );
        }

        fn _assert_entry_fee_token_registered(
            self: @ComponentState<TContractState>, token: @Token,
        ) {
            assert!(
                self._is_token_registered(token), "Tournament: Entry fee token is not registered",
            );
        }

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

        fn _assert_prize_token_registered(self: @ComponentState<TContractState>, token: @Token) {
            assert!(self._is_token_registered(token), "Tournament: Prize token is not registered");
        }

        fn _assert_registration_is_open(
            self: @ComponentState<TContractState>, tournament_id: u64, schedule: @Schedule,
        ) {
            match schedule.registration {
                Option::Some(_) => {
                    let state = self._get_state(schedule);
                    assert!(
                        state == TournamentState::Registration,
                        "Tournament: tournament {} is not open for registration.",
                        tournament_id,
                    );
                },
                // if registration period is None, then registration is always open
                Option::None => {},
            }
        }

        fn _assert_game_ended(
            self: @ComponentState<TContractState>, token_id: u64, expires_at: u64,
        ) {
            assert!(
                get_block_timestamp() >= expires_at,
                "Tournament: Game on token id {} is still live. Expires at {}",
                token_id,
                expires_at,
            );
        }

        fn _assert_tournament_ended(
            self: @ComponentState<TContractState>, end_time: u64, tournament_id: u64,
        ) {
            assert!(
                end_time <= get_block_timestamp(),
                "Tournament: Tournament id {} has not ended",
                tournament_id,
            );
        }

        fn _assert_tournament_not_ended(
            self: @ComponentState<TContractState>, end_time: u64, tournament_id: u64,
        ) {
            assert!(
                end_time > get_block_timestamp(),
                "Tournament: Tournament id {} has already ended",
                tournament_id,
            );
        }

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

        fn _assert_prize_exists(
            self: @ComponentState<TContractState>, token: ContractAddress, id: u64,
        ) {
            assert!(!token.is_zero(), "Tournament: Prize key {} does not exist", id);
        }

        fn _assert_prize_not_claimed(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_id: u64,
            prize_type: PrizeType,
        ) {
            let prize_claim = store.get_prize_claim(tournament_id, prize_type);
            assert!(!prize_claim.claimed, "Tournament: Prize has already been claimed");
        }

        fn _assert_payout_is_top_score(
            self: @ComponentState<TContractState>, payout_position: u8, winner_token_ids: Span<u64>,
        ) {
            assert!(
                payout_position.into() <= winner_token_ids.len(),
                "Tournament: Prize payout position {} is not a top score",
                payout_position,
            );
        }

        fn _assert_payout_is_not_top_score(
            self: @ComponentState<TContractState>, payout_position: u8, winner_token_ids: Span<u64>,
        ) {
            assert!(
                payout_position.into() > winner_token_ids.len(),
                "Tournament: Prize payout position {} is a top score",
                payout_position,
            );
        }


        fn _validate_token_ownership(
            self: @ComponentState<TContractState>,
            token: ContractAddress,
            token_id: u256,
            account: ContractAddress,
        ) {
            let owner = self._get_owner(token, token_id);
            assert!(owner == account, "Tournament: Caller does not own token id {}", token_id);
        }

        fn _assert_gated_token_owner(
            self: @ComponentState<TContractState>, token: ContractAddress, token_id: u256,
        ) {
            let owner = self._get_owner(token, token_id);
            assert!(
                owner == get_caller_address(),
                "Tournament: Caller does not own qualifying token id {}",
                token_id,
            );
        }

        fn _assert_gated_type_validates(
            self: @ComponentState<TContractState>,
            store: Store,
            entry_requirement: EntryRequirement,
        ) {
            match entry_requirement {
                EntryRequirement::token(token) => {
                    let token_model = store.get_token(token);
                    let token_address: felt252 = token.into();
                    assert!(
                        self._is_token_registered(@token_model),
                        "Tournament: Gated token address {} is not registered",
                        token_address,
                    )
                },
                EntryRequirement::tournament(tournament_type) => {
                    match tournament_type {
                        TournamentType::winners(tournament_ids) => {
                            let mut loop_index = 0;
                            loop {
                                if loop_index == tournament_ids.len() {
                                    break;
                                }
                                let tournament = store
                                    .get_tournament(*tournament_ids.at(loop_index));
                                self
                                    ._validate_tournament_finalized(
                                        tournament.id, @tournament.schedule,
                                    );
                                loop_index += 1;
                            }
                        },
                        TournamentType::participants(tournament_ids) => {
                            let mut loop_index = 0;
                            loop {
                                if loop_index == tournament_ids.len() {
                                    break;
                                }
                                let tournament = store
                                    .get_tournament(*tournament_ids.at(loop_index));
                                self
                                    ._validate_tournament_finalized(
                                        tournament.id, @tournament.schedule,
                                    );
                                loop_index += 1;
                            }
                        },
                    }
                },
                EntryRequirement::allowlist(_) => {},
            }
        }

        fn _validate_tournament_finalized(
            self: @ComponentState<TContractState>, tournament_id: u64, schedule: @Schedule,
        ) {
            let state = self._get_state(schedule);
            assert!(
                state == TournamentState::Finalized,
                "Tournament: Tournament {} is not finalized",
                tournament_id,
            );
        }

        fn _assert_tournament_not_finalized(
            self: @ComponentState<TContractState>, tournament_id: u64, schedule: @Schedule,
        ) {
            let state = self._get_state(schedule);
            assert!(
                state != TournamentState::Finalized,
                "Tournament: Tournament {} is finalized",
                tournament_id,
            );
        }

        fn _assert_player_is_eligible(
            self: @ComponentState<TContractState>,
            tournament_id: u64,
            store: Store,
            entry_requirement: EntryRequirement,
            qualifying_token_id: Option<u256>,
        ) {
            match entry_requirement {
                EntryRequirement::token(token_address) => {
                    match qualifying_token_id {
                        Option::Some(token_id) => {
                            self._assert_gated_token_owner(token_address, token_id);
                        },
                        Option::None => {
                            let token_address_felt: felt252 = token_address.into();
                            panic!(
                                "Tournament: tournament {} requires ownership of NFT {} to register",
                                tournament_id,
                                token_address_felt,
                            );
                        },
                    }
                },
                EntryRequirement::tournament(tournament_type) => {
                    match qualifying_token_id {
                        Option::Some(token_id) => {
                            self
                                ._assert_has_qualified_in_tournaments(
                                    store, tournament_type, token_id.try_into().unwrap(),
                                );
                        },
                        Option::None => {
                            panic!(
                                "Tournament: tournament {} requires proof of participation in a qualifying tournament",
                                tournament_id,
                            );
                        },
                    }
                },
                EntryRequirement::allowlist(addresses) => {
                    self._assert_qualifying_address(addresses);
                },
            }
        }

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
                let owner = self._get_owner(tournament.game_config.address, token_id.into());
                let registration = store.get_registration(tournament.id, token_id);

                if owner == get_caller_address()
                    && registration.tournament_id == tournament.id
                    && registration.entry_number != 0 {
                    if requires_top_score {
                        let game_dispatcher = IGameDispatcher {
                            contract_address: tournament.game_config.address,
                        };
                        let score = game_dispatcher.get_score(token_id);
                        is_qualified = self._is_top_score(store, tournament_id, score);
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

        fn _assert_qualifying_address(
            self: @ComponentState<TContractState>, qualifying_addresses: Span<ContractAddress>,
        ) {
            let mut found = false;
            let mut loop_index = 0;
            loop {
                if loop_index == qualifying_addresses.len() {
                    break;
                }
                let qualifying_address = *qualifying_addresses.at(loop_index);
                if qualifying_address == get_caller_address() {
                    found = true;
                    break;
                }
                loop_index += 1;
            };
            assert!(found, "Tournament: Caller is not in allowlist");
        }

        fn _assert_position_is_valid(
            self: @ComponentState<TContractState>, position: u8, winner_count: u32,
        ) {
            assert!(
                position > 0 && position.into() <= winner_count,
                "Tournament: Invalid position or no winner for this position",
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

        fn _mint_creator_game(
            ref self: ComponentState<TContractState>, tournament: @TournamentModel,
        ) -> u64 {
            let address = *tournament.game_config.address;
            let settings = *tournament.game_config.settings_id;
            let start = 0;
            let end = starknet::get_block_timestamp() - 1;
            let name = *tournament.metadata.name;
            let creator_address = *tournament.creator;
            self._mint_game(address, settings, start, end, name, creator_address)
        }

        fn _mint_player_game(
            ref self: ComponentState<TContractState>,
            tournament: @TournamentModel,
            player_name: felt252,
            player_address: ContractAddress,
        ) -> u64 {
            let address = *tournament.game_config.address;
            let settings = *tournament.game_config.settings_id;
            let start = *tournament.schedule.game.start;
            let end = *tournament.schedule.game.end;
            let name = player_name;

            self._mint_game(address, settings, start, end, name, player_address)
        }

        /// @title mint_game
        /// @notice Mints a new game token to the provided player address.
        /// @param game_address The address of the game contract.
        /// @param settings_id The id of the game settings.
        /// @param start_time The start time of the game.
        /// @param end_time The end time of the game.
        /// @param player_name The name of the player to mint the game token to.
        /// @param player_address The address of the player to mint the game token to.
        /// @return The game token id.
        fn _mint_game(
            ref self: ComponentState<TContractState>,
            game_address: ContractAddress,
            settings_id: u32,
            start_time: u64,
            end_time: u64,
            player_name: felt252,
            player_address: ContractAddress,
        ) -> u64 {
            let game_dispatcher = IGameDispatcher { contract_address: game_address };
            let game_token_id = game_dispatcher
                .new_game(player_name, settings_id, start_time, end_time, player_address);
            game_token_id
        }

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

        fn _calculate_payout(
            ref self: ComponentState<TContractState>, bp: u128, total_value: u128,
        ) -> u128 {
            (bp * total_value) / 100
        }

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
                                "Tournament: tournament {} does not have a tournament creator share set",
                                tournament_id,
                            )
                        }
                    },
                    Role::GameCreator => {
                        // TODO: issue #2
                        panic!("Tournament: Game creator fee not yet implemented")
                    },
                    Role::Position(position) => {
                        let leaderboard = store.get_leaderboard(tournament_id);
                        self._assert_position_is_valid(position, leaderboard.len());
                        *entry_fee.distribution.at(position.into() - 1)
                    },
                };

                let prize_amount = self._calculate_payout(share.into(), total_pool);

                // Get recipient address
                let recipient_address = match role {
                    Role::TournamentCreator => { tournament.creator },
                    Role::GameCreator => {
                        self._get_game_creator_address(tournament.game_config.address)
                    },
                    Role::Position(position) => {
                        let leaderboard = store.get_leaderboard(tournament_id);
                        let winner_token_id = *leaderboard.at(position.into() - 1);
                        self._get_owner(tournament.game_config.address, winner_token_id.into())
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

            // Get winner address
            let leaderboard = store.get_leaderboard(tournament_id);
            self._assert_position_is_valid(prize.payout_position, leaderboard.len());

            let winner_token_id = *leaderboard.at(prize.payout_position.into() - 1);
            let winner_address = self
                ._get_owner(tournament.game_config.address, winner_token_id.into());

            // Transfer prize
            match prize.token_type {
                TokenType::erc20(erc20_token) => {
                    let erc20 = IERC20Dispatcher { contract_address: prize.token_address };
                    erc20.transfer(winner_address, erc20_token.amount.into());
                },
                TokenType::erc721(erc721_token) => {
                    let erc721 = IERC721Dispatcher { contract_address: prize.token_address };
                    erc721
                        .transfer_from(
                            get_contract_address(), winner_address, erc721_token.id.into(),
                        );
                },
            };
        }

        fn _get_state(
            self: @ComponentState<TContractState>, schedule: @Schedule,
        ) -> TournamentState {
            let current_timestamp = get_block_timestamp();

            let mut registration_start = 0;
            let mut registration_end = 0;

            if let Option::Some(registration_period) = schedule.registration {
                registration_start = *registration_period.start;
                registration_end = *registration_period.end;
            }

            if current_timestamp < registration_start {
                TournamentState::Scheduled
            } else if current_timestamp < registration_end {
                TournamentState::Registration
            } else if current_timestamp < *schedule.game.start {
                TournamentState::Staging
            } else if current_timestamp < *schedule.game.end {
                TournamentState::Live
            } else if current_timestamp < *schedule.game.end + *schedule.submission_period {
                TournamentState::Submission
            } else {
                TournamentState::Finalized
            }
        }

        fn _validate_score_submission(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_id: u64,
            token_id: u64,
            position: u8,
            leaderboard_len: u32,
        ) {
            // Get tournament and validate state
            let tournament = store.get_tournament(tournament_id);
            assert!(
                self._get_state(@tournament.schedule) == TournamentState::Submission,
                "Tournament: Not in submission period",
            );

            // Validate position is within prize spots (1-based indexing)
            assert!(
                position > 0 && position <= tournament.game_config.prize_spots.into(),
                "Tournament: Invalid position",
            );

            // Validate registration
            let registration = store.get_registration(tournament_id, token_id);
            assert!(
                registration.tournament_id == tournament_id,
                "Tournament: Token not registered for tournament",
            );

            // Score can only be submitted once
            assert!(!registration.has_submitted, "Tournament: Score already submitted");

            // Prevent gaps in leaderboard
            let position_index: u32 = position.into() - 1;
            assert!(
                position_index <= leaderboard_len,
                "Tournament: Must submit for next available position",
            );
        }

        fn _update_leaderboard(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_id: u64,
            token_id: u64,
            position: u8,
            current_leaderboard: Span<u64>,
        ) -> Leaderboard {
            // convert position to 0-based index
            let position_index: u32 = position.into() - 1;

            // if the new score is in the last position, save gas and simply append it to the
            // leaderboard
            if position_index == current_leaderboard.len() {
                self._append_to_leaderboard(tournament_id, token_id, current_leaderboard)
            } else {
                // otherwise we need to insert it into the leaderboard
                self
                    ._insert_into_leaderboard(
                        store, tournament_id, token_id, position_index, current_leaderboard,
                    )
            }
        }

        fn _append_to_leaderboard(
            self: @ComponentState<TContractState>,
            tournament_id: u64,
            token_id: u64,
            current_leaderboard: Span<u64>,
        ) -> Leaderboard {
            let mut new_token_ids = ArrayTrait::new();
            let mut i = 0;
            loop {
                if i >= current_leaderboard.len() {
                    break;
                }
                new_token_ids.append(*current_leaderboard.at(i));
                i += 1;
            };
            new_token_ids.append(token_id);

            Leaderboard { tournament_id, token_ids: new_token_ids.span() }
        }

        fn _insert_into_leaderboard(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_id: u64,
            token_id: u64,
            position_index: u32,
            current_leaderboard: Span<u64>,
        ) -> Leaderboard {
            // Verify score is high enough for position
            let tournament = store.get_tournament(tournament_id);
            let game_dispatcher = IGameDispatcher {
                contract_address: tournament.game_config.address,
            };
            let submitted_score = game_dispatcher.get_score(token_id);
            assert!(
                submitted_score > game_dispatcher
                    .get_score(*current_leaderboard.at(position_index)),
                "Tournament: Score not high enough for position",
            );

            // Create new leaderboard with inserted score
            let mut new_leaderboard = ArrayTrait::new();
            let mut i = 0;

            // Copy scores up to the position
            loop {
                if i >= position_index {
                    break;
                }
                new_leaderboard.append(*current_leaderboard.at(i));
                i += 1;
            };

            // Insert new score
            new_leaderboard.append(token_id);

            // Copy remaining scores
            loop {
                if i >= current_leaderboard.len() {
                    break;
                }
                new_leaderboard.append(*current_leaderboard.at(i));
                i += 1;
            };

            Leaderboard { tournament_id, token_ids: new_leaderboard.span() }
        }

        fn _mark_score_submitted(
            ref self: ComponentState<TContractState>,
            ref store: Store,
            tournament_id: u64,
            token_id: u64,
        ) {
            let registration = store.get_registration(tournament_id, token_id);
            store
                .set_registration(
                    @Registration {
                        tournament_id,
                        game_token_id: token_id,
                        entry_number: registration.entry_number,
                        has_submitted: true,
                    },
                );
        }

        fn _validate_entry_requirement(
            self: @ComponentState<TContractState>,
            store: Store,
            entry_requirement: EntryRequirement,
            player_address: ContractAddress,
            qualification_proof: Option<QualificationProof>,
        ) {
            match entry_requirement {
                EntryRequirement::tournament(tournament_type) => {
                    self
                        ._validate_tournament_qualification(
                            store, tournament_type, qualification_proof, player_address,
                        );
                },
                EntryRequirement::token(token_address) => {
                    self
                        ._validate_nft_qualification(
                            token_address, player_address, qualification_proof,
                        );
                },
                EntryRequirement::allowlist(addresses) => {
                    self._validate_allowlist_qualification(addresses, player_address);
                },
            }
        }

        fn _validate_tournament_qualification(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_type: TournamentType,
            qualification_proof: Option<QualificationProof>,
            player_address: ContractAddress,
        ) {
            let qualification = match qualification_proof {
                Option::Some(proof) => proof,
                Option::None => panic!("Tournament: Token ID from qualifying tournament required"),
            };

            let qualification = match qualification {
                QualificationProof::Tournament(qual) => qual,
                _ => panic!("Tournament: Provided qualification proof is not of type 'Tournament'"),
            };

            // Get qualifying tournament
            let qualifying_tournament = store.get_tournament(qualification.tournament_id);
            let leaderboard = store.get_leaderboard(qualification.tournament_id);

            // assert tournament is finalized
            self
                ._validate_tournament_finalized(
                    qualification.tournament_id, @qualifying_tournament.schedule,
                );

            // assert tournament is in qualifying set
            self._validate_tournament_eligibility(tournament_type, qualification.tournament_id);

            // assert position requirements
            self._validate_position_requirements(leaderboard, tournament_type, qualification);

            // assert token ownership
            self
                ._validate_token_ownership(
                    qualifying_tournament.game_config.address,
                    qualification.token_id.into(),
                    player_address,
                );
        }

        fn _validate_nft_qualification(
            self: @ComponentState<TContractState>,
            token_address: ContractAddress,
            player_address: ContractAddress,
            qualification_proof: Option<QualificationProof>,
        ) {
            let qualification = match qualification_proof {
                Option::Some(proof) => proof,
                Option::None => panic!("Tournament: Token ID from qualifying NFT required"),
            };

            match qualification {
                QualificationProof::NFT(nft) => {
                    let erc721_dispatcher = IERC721Dispatcher { contract_address: token_address };
                    assert!(
                        erc721_dispatcher.owner_of(nft.token_id) == player_address,
                        "Tournament: Player does not own required token",
                    );
                },
                _ => { panic!("Tournament: Provided qualification proof is not of type 'NFT'"); },
            }
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

        fn _validate_allowlist_qualification(
            self: @ComponentState<TContractState>,
            allowlist_addresses: Span<ContractAddress>,
            player_address: ContractAddress,
        ) {
            assert!(
                self._contains_address(allowlist_addresses, player_address),
                "Tournament: Player not in allowlist",
            );
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
