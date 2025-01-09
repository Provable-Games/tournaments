use starknet::ContractAddress;
use tournaments::components::models::tournament::{
    Tournament as TournamentModel, GatedType, Premium, TokenDataType
};

///
/// Interface
///

#[starknet::interface]
trait ITournament<TState> {
    fn total_tournaments(self: @TState) -> u128;
    fn tournament(self: @TState, tournament_id: u128) -> TournamentModel;
    fn tournament_entries(self: @TState, tournament_id: u128) -> u64;
    fn is_token_registered(self: @TState, token: ContractAddress) -> bool;
    // TODO: add for V2 (only ERC721 tokens)
    // fn register_tokens(ref self: TState, tokens: Array<Token>);
    fn create_tournament(
        ref self: TState,
        name: felt252,
        description: ByteArray,
        registration_start_time: u64,
        registration_end_time: u64,
        start_time: u64,
        end_time: u64,
        submission_period: u64,
        winners_count: u8,
        gated_type: Option<GatedType>,
        entry_premium: Option<Premium>,
        game_address: ContractAddress,
        settings_id: u32
    ) -> u256;
    fn enter_tournament(
        ref self: TState, tournament_id: u128, qualifying_token_id: Option<u256>
    ) -> u256;
    fn start_game(ref self: TState, tournament_id: u128, tournament_token_id: u256);
    fn submit_scores(ref self: TState, tournament_id: u128, token_ids: Array<u256>);
    fn finalize_tournament(ref self: TState, tournament_id: u128);
    fn distribute_prize(ref self: TState, prize_key: u128);
    fn distribute_unclaimable_prize(ref self: TState, prize_key: u128);
    fn add_prize(
        ref self: TState,
        tournament_id: u128,
        token: ContractAddress,
        token_data_type: TokenDataType,
        position: u8
    );
}

///
/// Tournament Component
///

#[starknet::component]
pub mod tournament_component {
    use super::ITournament;

    use core::num::traits::Zero;

    use tournaments::components::constants::{
        MIN_REGISTRATION_PERIOD, MAX_REGISTRATION_PERIOD, MIN_TOURNAMENT_LENGTH,
        MAX_TOURNAMENT_LENGTH, MIN_SUBMISSION_PERIOD, MAX_SUBMISSION_PERIOD,
        TEST_MIN_REGISTRATION_PERIOD, TEST_MIN_SUBMISSION_PERIOD, TEST_MIN_TOURNAMENT_LENGTH,
        GAME_EXPIRATION_PERIOD, DEFAULT_NS
    };
    use tournaments::components::interfaces::{
        IGameDispatcher, IGameDispatcherTrait, IGAME_ID, IGAME_METADATA_ID
    };
    use tournaments::components::models::tournament::{
        Tournament as TournamentModel, TournamentToken, TournamentState, TournamentGameState, TournamentEntries,
        TournamentScores, TournamentTotals, TournamentPrize, Token, TournamentConfig, TokenDataType,
        GatedType, TournamentType, Premium, ERC20Data, ERC721Data
    };
    use tournaments::components::interfaces::{WorldTrait, WorldImpl,};
    use tournaments::components::libs::store::{Store, StoreTrait};

    use dojo::contract::components::world_provider::{IWorldProvider};


    use starknet::{ContractAddress, get_block_timestamp, get_contract_address, get_caller_address};

    use openzeppelin_introspection::{
        src5::SRC5Component, interface::{ISRC5Dispatcher, ISRC5DispatcherTrait}
    };
    use openzeppelin_token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use openzeppelin_token::erc721::interface::{
        IERC721Dispatcher, IERC721DispatcherTrait, IERC721_ID
    };
    use openzeppelin_token::erc721::{
        ERC721Component, ERC721Component::{InternalImpl as ERC721InternalImpl},
    };

    #[storage]
    pub struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {}

    mod Errors {
        //
        // Register Tokens
        //
        pub const TOKEN_ALREADY_REGISTERED: felt252 = 'token already registered';
        pub const INVALID_TOKEN_ALLOWANCES: felt252 = 'invalid token allowances';
        pub const INVALID_TOKEN_BALANCES: felt252 = 'invalid token balances';
        pub const TOKEN_SUPPLY_TOO_LARGE: felt252 = 'token supply too large';
        pub const INVALID_TOKEN_APPROVALS: felt252 = 'invalid token approvals';
        pub const INVALID_TOKEN_OWNER: felt252 = 'invalid token owner';
        //
        // Create Tournament
        //
        pub const START_TIME_NOT_IN_FUTURE: felt252 = 'start time not in future';
        pub const REGISTRATION_PERIOD_TOO_SHORT: felt252 = 'registration period too short';
        pub const REGISTRATION_PERIOD_TOO_LONG: felt252 = 'registration period too long';
        pub const REGISTRATION_START_TOO_LATE: felt252 = 'registration start too late';
        pub const REGISTRATION_END_TOO_LATE: felt252 = 'registration end too late';
        pub const TOURNAMENT_TOO_SHORT: felt252 = 'tournament too short';
        pub const TOURNAMENT_TOO_LONG: felt252 = 'tournament too long';
        pub const ZERO_WINNERS_COUNT: felt252 = 'zero winners count';
        pub const NO_QUALIFYING_NFT: felt252 = 'no qualifying nft';
        pub const GATED_TOKEN_NOT_REGISTERED: felt252 = 'gated token not registered';
        pub const PREMIUM_TOKEN_NOT_REGISTERED: felt252 = 'premium token not registered';
        pub const PREMIUM_DISTRIBUTIONS_TOO_LONG: felt252 = 'premium distributions too long';
        pub const PREMIUM_DISTRIBUTIONS_NOT_100: felt252 = 'premium distributions not 100%';
        pub const SUBMISSION_PERIOD_TOO_SHORT: felt252 = 'submission period too short';
        pub const SUBMISSION_PERIOD_TOO_LONG: felt252 = 'submission period too long';
        pub const NOT_TOKEN_OWNER: felt252 = 'not token owner';
        pub const IGAME_NOT_SUPPORTED: felt252 = 'IGame not supported';
        pub const IGAME_METADATA_NOT_SUPPORTED: felt252 = 'IGameMetadata not supported';
        pub const IERC721_NOT_SUPPORTED: felt252 = 'IERC721 not supported';
        pub const GAME_SETTINGS_NOT_FOUND: felt252 = 'game settings not found';
        //
        // Enter Tournament
        //
        pub const NOT_WITHIN_REGISTRATION_PERIOD: felt252 = 'not within registration period';
        pub const GAME_DOES_NOT_QUALIFY: felt252 = 'game does not qualify';
        pub const GAME_DID_NOT_PARTICIPATE: felt252 = 'game did not participate';
        pub const NO_QUALIFYING_TOKEN_SUPPLIED: felt252 = 'no qualifying token supplied';
        pub const ADDRESS_DOES_NOT_QUALIFY: felt252 = 'address does not qualify';
        //
        // Start Tournament
        //
        pub const TOURNAMENT_NOT_ACTIVE: felt252 = 'tournament not active';
        pub const ALL_ENTRIES_STARTED: felt252 = 'all entries started';
        pub const ADDRESS_ENTRIES_STARTED: felt252 = 'address entries started';
        pub const START_COUNT_TOO_LARGE: felt252 = 'start count too large';
        pub const TOURNAMENT_PERIOD_TOO_LONG: felt252 = 'period too long to start all';
        //
        // Submit Scores
        //
        pub const TOURNAMENT_NOT_FINALIZED: felt252 = 'tournament not finalized';
        pub const TOURNAMENT_NOT_ENDED: felt252 = 'tournament not ended';
        pub const TOURNAMENT_ALREADY_SETTLED: felt252 = 'tournament already settled';
        pub const NOT_GAME_OWNER: felt252 = 'not game owner';
        pub const GAME_NOT_STARTED: felt252 = 'game not started';
        pub const GAME_NOT_SUBMITTED: felt252 = 'game not submitted';
        pub const INVALID_SCORES_SUBMISSION: felt252 = 'invalid scores submission';
        pub const INVALID_SCORE: felt252 = 'invalid score';
        //
        // Finalize Tournament
        //
        pub const TOURNAMENT_ALREADY_FINALIZED: felt252 = 'tournament already finalized';
        //
        // Add Prize
        //
        pub const TOURNAMENT_ENDED: felt252 = 'tournament ended';
        pub const PRIZE_POSITION_TOO_LARGE: felt252 = 'prize position too large';
        pub const PRIZE_TOKEN_NOT_REGISTERED: felt252 = 'prize token not registered';
        pub const INVALID_TOKEN_AMOUNT: felt252 = 'invalid token amount';
        //
        // Distribute Prizes
        //
        pub const TOURNAMENT_NOT_SETTLED: felt252 = 'tournament not settled';
        pub const DISTRIBUTE_ALREADY_CALLED: felt252 = 'distribute already called';
        pub const NO_PRIZE_KEYS: felt252 = 'no prize keys provided';
        pub const PRIZE_DOES_NOT_EXIST: felt252 = 'prize does not exist';
        pub const PRIZE_ALREADY_CLAIMED: felt252 = 'prize already claimed';
        pub const PAYOUT_POSITION_NOT_TOP_SCORE: felt252 = 'payout position not top score';
        pub const PAYOUT_POSITION_TOP_SCORE: felt252 = 'payout position is top score';
    }

    #[embeddable_as(TournamentImpl)]
    impl Tournament<
        TContractState,
        +HasComponent<TContractState>,
        +IWorldProvider<TContractState>,
        +ERC721Component::ERC721HooksTrait<TContractState>,
        impl ERC721: ERC721Component::HasComponent<TContractState>,
        impl SRC5: SRC5Component::HasComponent<TContractState>,
        +Drop<TContractState>
    > of ITournament<ComponentState<TContractState>> {
        fn total_tournaments(self: @ComponentState<TContractState>) -> u128 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            store.get_tournament_totals(get_contract_address()).tournaments
        }
        fn tournament(
            self: @ComponentState<TContractState>, tournament_id: u128
        ) -> TournamentModel {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            store.get_tournament(tournament_id)
        }
        fn tournament_entries(self: @ComponentState<TContractState>, tournament_id: u128) -> u64 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            store.get_total_entries(tournament_id).entry_count
        }

        fn is_token_registered(
            self: @ComponentState<TContractState>, token: ContractAddress
        ) -> bool {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            let token = store.get_token(token);
            self._is_token_registered(token)
        }

        // TODO: add for V2 (use Ekubo tokens)
        // fn register_tokens(ref self: ComponentState<TContractState>, tokens: Array<Token>) {
        //     let mut world = WorldTrait::storage(
        //         self.get_contract().world_dispatcher(), @"tournament"
        //     );
        //     let mut store: Store = StoreTrait::new(world);
        //     self._register_tokens(ref store, tokens);
        // }

        /// @title Create tournament
        /// @notice Allows a player to create a tournament.
        /// @dev Registration times provide capability of seasons (overlaps of entry periods and
        /// start periods).
        /// @param self A reference to the ContractState object.
        /// @param name A felt252 representing the name of the tournament.
        /// @param description A ByteArray representing the description of the tournament.
        /// @param registration_start_time A u64 representing the start time of the registration
        /// period.
        /// @param registration_end_time A u64 representing the end time of the registration period.
        /// @param start_time A u64 representing the start time of the tournament.
        /// @param end_time A u64 representing the end time of the tournament.
        /// @param submission_period A u64 representing the length of the submission period.
        /// @param winners_count A u8 representing the number of winners.
        /// @param gated_type A Option<GatedType> representing the gated type of the tournament.
        /// @param entry_premium A Option<Premium> representing the entry premium of the tournament.
        /// @param game A ContractAddress representing the game to be played in the tournament.
        /// @param settings_id A u32 representing the settings id to be used for the tournament.
        fn create_tournament(
            ref self: ComponentState<TContractState>,
            name: felt252,
            description: ByteArray,
            registration_start_time: u64,
            registration_end_time: u64,
            start_time: u64,
            end_time: u64,
            submission_period: u64,
            winners_count: u8,
            gated_type: Option<GatedType>,
            entry_premium: Option<Premium>,
            game_address: ContractAddress,
            settings_id: u32
        ) -> u256 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);

            self._assert_future_start_time(registration_start_time, start_time);
            self
                ._assert_bigger_than_min_registration_period(
                    store, registration_start_time, registration_end_time
                );
            self
                ._assert_less_than_max_registration_period(
                    registration_start_time, registration_end_time
                );
            self
                ._assert_registration_start_not_after_tournament_start(
                    registration_start_time, start_time
                );
            self._assert_registration_end_not_after_tournament_end(registration_end_time, end_time);
            self._assert_tournament_length_not_too_short(store, end_time, start_time);
            self._assert_tournament_length_not_too_long(end_time, start_time);
            self._assert_submission_period_larger_than_minimum(store, submission_period);
            self._assert_submission_period_less_than_maximum(submission_period);
            self._assert_winners_count_greater_than_zero(winners_count);
            self._assert_gated_type_validates(store, gated_type);
            self
                ._assert_premium_token_registered_and_distribution_valid(
                    store, entry_premium.clone(), winners_count
                );

            let src5_dispatcher = ISRC5Dispatcher { contract_address: game_address };

            self._assert_game_supports_game_interface(src5_dispatcher);
            self._assert_game_supports_game_metadata_interface(src5_dispatcher);
            self._assert_game_supports_erc721_interface(src5_dispatcher);

            self._assert_settings_exists(store, game_address, settings_id);

            let mut totals = store.get_tournament_totals(get_contract_address());
            totals.tokens += 1;
            let token_id = totals.tokens.into();

            let mut erc721 = get_dep_component_mut!(ref self, ERC721);
            erc721.mint(get_caller_address(), token_id);

            totals.tournaments += 1;

            store
                .set_tournament_token(
                    @TournamentToken {
                        token_id: token_id.low,
                        tournament_id: totals.tournaments,
                        game_id: 0,
                        score: 0,
                        state: Option::None,
                        registration_number: 0
                    }
                );

            store
                .set_tournament(
                    @TournamentModel {
                        tournament_id: totals.tournaments,
                        name,
                        description,
                        creator: get_caller_address(),
                        registration_start_time,
                        registration_end_time,
                        start_time,
                        end_time,
                        submission_period,
                        winners_count,
                        gated_type,
                        entry_premium,
                        game_address,
                        settings_id,
                        state: TournamentState::PreRegistration,
                    }
                );

            store.set_tournament_totals(@totals);
            token_id
        }

        /// @title Enter tournament
        /// @notice Allows a player to enter a tournament for a particular tournament id.
        /// @dev Requires a tournament to have already been created.
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        /// @param qualifying_token_id A Option<u256> representing the qualifying token id.
        fn enter_tournament(
            ref self: ComponentState<TContractState>,
            tournament_id: u128,
            qualifying_token_id: Option<u256>
        ) -> u256 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);
            self
                ._assert_within_registration_period(
                    tournament.registration_start_time, tournament.registration_end_time
                );

            self
                ._assert_qualifies_gating(
                    store,
                    tournament.gated_type,
                    qualifying_token_id,
                    get_caller_address()
                );

            self._pay_premiums(tournament.entry_premium);

            let mut totals = store.get_tournament_totals(get_contract_address());
            totals.tokens += 1;

            let token_id = self._mint_tournament_token(totals.tokens);

            let tournament_entries = store.get_total_entries(tournament_id).entry_count;

            store
                .set_tournament_token(
                    @TournamentToken {
                        token_id: totals.tokens,
                        tournament_id,
                        game_id: 0,
                        score: 0,
                        state: Option::Some(TournamentGameState::Registered),
                        registration_number: tournament_entries + 1
                    }
                );

            store
                .set_total_entries(
                    @TournamentEntries { tournament_id, entry_count: tournament_entries + 1 }
                );

            if (tournament.state == TournamentState::PreRegistration) {
                tournament.state = TournamentState::Registration;
                store.set_tournament(@tournament);
            }

            store.set_tournament_totals(@totals);
            token_id
        }

        /// @title Start tournament
        /// @notice Allows a player to start a tournament for a particular tournament id.
        /// @dev Requires the player starting to have already entered.
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u128 representing the unique ID of the tournament.
        /// @param tournament_token_id A u256 representing the unique ID of the tournament token.
        fn start_game(
            ref self: ComponentState<TContractState>, tournament_id: u128, tournament_token_id: u256
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);

            let tournament = store.get_tournament(tournament_id);
            self._assert_tournament_active(@tournament);
            let game_id = self._start_game(tournament, tournament_token_id);

            let mut token = store.get_tournament_token(tournament_token_id.low);

            token.game_id = game_id.low;
            token.state = Option::Some(TournamentGameState::Started);

            store.set_tournament_token(@token);

            if (tournament.state != TournamentState::Active) {
                tournament.state = TournamentState::Active;
                store.set_tournament(@tournament);
            }
        }

        /// @title Finalize tournament
        /// @notice Allows anyone to finalize a tournament for a particular tournament
        /// id.
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        fn finalize_tournament(ref self: ComponentState<TContractState>, tournament_id: u128) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);

            self._assert_tournament_not_finalized(tournament.state);

            self._assert_tournament_ended(tournament.end_time);

            let mut totals = store.get_tournament_totals(get_contract_address());

            self._format_premium_config_into_prize_keys(ref store, ref totals, tournament_id);

            store.set_tournament_totals(@totals);

            tournament.state = TournamentState::Finalized;
            store.set_tournament(@tournament);
        }

        /// @title Submit scores
        /// @notice Allows anyone to submit scores for a tournament for a particular tournament id.
        /// @dev For more efficient gas we assume that the game ids are in order of highest score
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u128 representing the unique ID of the tournament.
        /// @param token_ids An array of u256 representing the token ids to submit.
        fn submit_scores(
            ref self: ComponentState<TContractState>, tournament_id: u128, token_ids: Array<u256>
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);

            self._assert_tournament_finalized(tournament.state);
            self._assert_scores_count_valid(ref tournament, token_ids.len());
            self._assert_tournament_not_settled(ref tournament);

            let mut game_dispatcher = IGameDispatcher { contract_address: tournament.game_address };

            // loop through game ids and update scores
            let mut num_games = token_ids.len();
            let mut token_index = 0;
            let mut new_score_ids = ArrayTrait::<u128>::new();
            loop {
                if token_index == num_games {
                    break;
                }
                let token_id = *token_ids.at(token_index);
                let token = store.get_tournament_token(token_id.low);

                self._assert_token_started(token.state);

                let score = game_dispatcher.get_score(token.game_id.into());
                self._assert_score_valid(score);

                self
                    ._update_tournament_scores(
                        store,
                        tournament_id,
                        token.game_id.into(),
                        score,
                        ref new_score_ids,
                        token_index
                    );

                store
                    .set_tournament_token(
                        @TournamentToken {
                            token_id: token_id.low,
                            tournament_id,
                            game_id: token.game_id,
                            score,
                            state: Option::Some(TournamentGameState::Submitted),
                            registration_number: token.registration_number
                        }
                    );
                token_index += 1;
            };
            store
                .set_tournament_scores(
                    @TournamentScores { tournament_id, top_score_ids: new_score_ids.span() }
                );
        }

        /// @title Distribute prize
        /// @notice Allows anyone to distribute the prize to a top score for a particular prize key.
        /// @param self A reference to the ContractState object.
        /// @param prize_key A u128 representing the prize key to distribute.
        fn distribute_prize(ref self: ComponentState<TContractState>, prize_key: u128) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);

            let mut prize = store.get_prize(prize_key);
            let mut tournament = store.get_tournament(prize.tournament_id);

            self._assert_tournament_finalized(tournament.state);
            self._assert_tournament_settled(@tournament);
            self._assert_prize_exists(prize.token);
            self._assert_prize_not_claimed(prize.claimed);

            let top_score_ids = store.get_tournament_scores(prize.tournament_id).top_score_ids;
            self._assert_payout_is_top_score(prize.payout_position, top_score_ids.clone());

            let payout_token_id = *top_score_ids.at(prize.payout_position.into() - 1);
            let payout_game_id = store.get_tournament_token(payout_token_id).game_id;
            let payout_position_address = self
                ._get_owner(tournament.game_address, payout_game_id.into());

            self._distribute_prize_to_top_score(prize, payout_position_address);

            prize.claimed = true;
            store.set_prize(@prize);

            if (tournament.state != TournamentState::Submitted) {
                tournament.state = TournamentState::Submitted;
                store.set_tournament(@tournament);
            }
        }

        /// @title Distribute unclaimable prize
        /// @notice Allows anyone to distribute the prize to the creator of the tournament.
        /// @param self A reference to the ContractState object.
        /// @param prize_key A u128 representing the prize key to distribute.
        fn distribute_unclaimable_prize(ref self: ComponentState<TContractState>, prize_key: u128) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);

            let mut prize = store.get_prize(prize_key);
            let mut tournament = store.get_tournament(prize.tournament_id);

            self._assert_tournament_finalized(tournament.state);
            self._assert_tournament_settled(@tournament);
            self._assert_prize_exists(prize.token);
            self._assert_prize_not_claimed(prize.claimed);

            let top_score_ids = store.get_tournament_scores(prize.tournament_id).top_score_ids;
            self._assert_payout_is_not_top_score(prize.payout_position, top_score_ids);

            self._distribute_prize_to_creator(prize, tournament.creator);

            prize.claimed = true;
            store.set_prize(@prize);

            if (tournament.state != TournamentState::Submitted) {
                tournament.state = TournamentState::Submitted;
                store.set_tournament(@tournament);
            }
        }

        /// @title Add prize
        /// @notice Allows anyone to add a prize for a tournament for a particular tournament id.
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        /// @param token A contract address representing the token to add as a prize.
        /// @param token_data_type A TokenDataType representing the type of token to add as a prize.
        /// @param position A u8 representing the scoreboard position to distribute the prize to.
        fn add_prize(
            ref self: ComponentState<TContractState>,
            tournament_id: u128,
            token: ContractAddress,
            token_data_type: TokenDataType,
            position: u8
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);

            self._assert_tournament_not_ended(tournament.end_time);

            let token_model = store.get_token(token);
            self._assert_prize_token_registered(token_model);

            self._assert_prize_position_less_than_winners_count(tournament, position);

            self._deposit_prize(tournament_id, token, token_data_type, position);

            let mut totals = store.get_tournament_totals(get_contract_address());
            totals.prizes += 1;
            store.set_tournament_totals(@totals);

            store
                .set_prize(
                    @TournamentPrize {
                        tournament_id,
                        prize_key: totals.prizes.into(),
                        token: token,
                        token_data_type: token_data_type,
                        payout_position: position,
                        claimed: false
                    }
                );
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
        +Drop<TContractState>
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
            test_mode: bool
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            // Store the config
            store
                .set_tournament_config(
                    @TournamentConfig { contract: get_contract_address(), safe_mode, test_mode, }
                );

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
            token: ContractAddress,
            name: ByteArray,
            symbol: ByteArray,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            let token_model = store.get_token(token);
            assert(!self._is_token_registered(token_model), Errors::TOKEN_ALREADY_REGISTERED);
            store
                .set_token(
                    @Token {
                        token: token,
                        name: name,
                        symbol: symbol,
                        token_data_type: TokenDataType::erc20(ERC20Data { token_amount: 1 }),
                        is_registered: true
                    }
                );
        }

        /// @title Initialize erc721
        /// @notice Initializes an erc721 token for registration.
        /// @param self A copy to the ContractState object.
        /// @param token A contract address representing the token.
        /// @param name A byte array representing the name of the token.
        /// @param symbol A byte array representing the symbol of the token.
        fn initialize_erc721(
            self: @ComponentState<TContractState>,
            token: ContractAddress,
            name: ByteArray,
            symbol: ByteArray
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            let token_model = store.get_token(token);
            assert(!self._is_token_registered(token_model), Errors::TOKEN_ALREADY_REGISTERED);
            store
                .set_token(
                    @Token {
                        token: token,
                        name: name,
                        symbol: symbol,
                        token_data_type: TokenDataType::erc721(ERC721Data { token_id: 1 }),
                        is_registered: true
                    }
                );
        }

        //
        // GETTERS
        //

        fn get_score_from_id(
            self: @ComponentState<TContractState>, store: Store, tournament_id: u128, game_id: u256
        ) -> u64 {
            let tournament = store.get_tournament(tournament_id);
            let game_dispatcher = IGameDispatcher { contract_address: tournament.game_address };
            game_dispatcher.get_score(game_id)
        }

        fn _get_owner(
            self: @ComponentState<TContractState>, token: ContractAddress, token_id: u256
        ) -> ContractAddress {
            IERC721Dispatcher { contract_address: token }.owner_of(token_id)
        }

        fn _is_tournament_active(
            self: @ComponentState<TContractState>, tournament: @TournamentModel
        ) -> bool {
            *tournament.start_time <= get_block_timestamp() && *tournament.end_time > get_block_timestamp()
        }

        fn _is_token_registered(
            self: @ComponentState<TContractState>, token: Token
        ) -> bool {
            token.is_registered
        }

        fn _is_top_score(
            self: @ComponentState<TContractState>, store: Store, tournament_id: u128, score: u64
        ) -> bool {
            let top_score_ids = store.get_tournament_scores(tournament_id).top_score_ids;
            let num_scores = top_score_ids.len();

            if num_scores == 0 {
                return true;
            }

            let last_place_id = *top_score_ids.at(num_scores - 1);
            let last_place_score = self
                .get_score_from_id(store, tournament_id, last_place_id.try_into().unwrap());
            score >= last_place_score
        }

        //
        // ASSERTIONS
        //

        fn _assert_future_start_time(
            self: @ComponentState<TContractState>, registration_start_time: u64, start_time: u64
        ) {
            assert(
                registration_start_time >= get_block_timestamp(), Errors::START_TIME_NOT_IN_FUTURE
            );
            assert(start_time >= get_block_timestamp(), Errors::START_TIME_NOT_IN_FUTURE);
        }

        fn _assert_bigger_than_min_registration_period(
            self: @ComponentState<TContractState>,
            store: Store,
            registration_start_time: u64,
            registration_end_time: u64
        ) {
            let test_mode = store.get_tournament_config(get_contract_address()).test_mode;
            let min_registration_period = if test_mode {
                TEST_MIN_REGISTRATION_PERIOD
            } else {
                MIN_REGISTRATION_PERIOD
            };
            assert(
                registration_end_time - registration_start_time >= min_registration_period.into(),
                Errors::REGISTRATION_PERIOD_TOO_SHORT
            );
        }

        fn _assert_less_than_max_registration_period(
            self: @ComponentState<TContractState>,
            registration_start_time: u64,
            registration_end_time: u64
        ) {
            assert(
                registration_end_time - registration_start_time < MAX_REGISTRATION_PERIOD.into(),
                Errors::REGISTRATION_PERIOD_TOO_LONG
            );
        }

        fn _assert_registration_start_not_after_tournament_start(
            self: @ComponentState<TContractState>,
            registration_start_time: u64,
            tournament_start_time: u64
        ) {
            assert(
                registration_start_time <= tournament_start_time,
                Errors::REGISTRATION_START_TOO_LATE
            );
        }

        fn _assert_registration_end_not_after_tournament_end(
            self: @ComponentState<TContractState>,
            registration_end_time: u64,
            tournament_end_time: u64
        ) {
            assert(registration_end_time <= tournament_end_time, Errors::REGISTRATION_END_TOO_LATE);
        }

        fn _assert_tournament_length_not_too_short(
            self: @ComponentState<TContractState>, store: Store, end_time: u64, start_time: u64
        ) {
            let test_mode = store.get_tournament_config(get_contract_address()).test_mode;
            let min_tournament_length = if test_mode {
                TEST_MIN_TOURNAMENT_LENGTH
            } else {
                MIN_TOURNAMENT_LENGTH
            };
            assert(
                end_time - start_time >= min_tournament_length.into(), Errors::TOURNAMENT_TOO_SHORT
            );
        }

        fn _assert_tournament_length_not_too_long(
            self: @ComponentState<TContractState>, end_time: u64, start_time: u64
        ) {
            assert(
                end_time - start_time <= MAX_TOURNAMENT_LENGTH.into(), Errors::TOURNAMENT_TOO_LONG
            );
        }

        fn _assert_submission_period_larger_than_minimum(
            self: @ComponentState<TContractState>, store: Store, submission_period: u64
        ) {
            let test_mode = store.get_tournament_config(get_contract_address()).test_mode;
            let min_submission_period = if test_mode {
                TEST_MIN_SUBMISSION_PERIOD
            } else {
                MIN_SUBMISSION_PERIOD
            };
            assert(
                submission_period >= min_submission_period.into(),
                Errors::SUBMISSION_PERIOD_TOO_SHORT
            );
        }

        fn _assert_submission_period_less_than_maximum(
            self: @ComponentState<TContractState>, submission_period: u64
        ) {
            assert(
                submission_period <= MAX_SUBMISSION_PERIOD.into(),
                Errors::SUBMISSION_PERIOD_TOO_LONG
            );
        }

        fn _assert_winners_count_greater_than_zero(
            self: @ComponentState<TContractState>, winners_count: u8
        ) {
            assert(winners_count > 0, Errors::ZERO_WINNERS_COUNT);
        }

        fn _assert_premium_token_registered_and_distribution_valid(
            self: @ComponentState<TContractState>,
            store: Store,
            premium: Option<Premium>,
            winners_count: u8
        ) {
            match premium {
                Option::Some(token) => {
                    let token_model = store.get_token(token.token);
                    self._assert_premium_token_registered(token_model);
                    self
                        ._assert_premium_token_distribution_length_not_too_long(
                            token.token_distribution.len(), winners_count.into()
                        );
                    // check the sum of distributions is equal to 100%
                    let mut distribution_sum: u8 = 0;
                    let mut distribution_index: u32 = 0;
                    loop {
                        if distribution_index == token.token_distribution.len() {
                            break;
                        }
                        let distribution = *token.token_distribution.at(distribution_index);
                        distribution_sum += distribution;
                        distribution_index += 1;
                    };
                    self._assert_premium_token_distribution_sum_is_100(distribution_sum);
                },
                Option::None => {},
            }
        }

        fn _assert_game_supports_game_interface(
            self: @ComponentState<TContractState>, src5_dispatcher: ISRC5Dispatcher
        ) {
            assert(src5_dispatcher.supports_interface(IGAME_ID), Errors::IGAME_NOT_SUPPORTED);
        }

        fn _assert_game_supports_game_metadata_interface(
            self: @ComponentState<TContractState>, src5_dispatcher: ISRC5Dispatcher
        ) {
            assert(
                src5_dispatcher.supports_interface(IGAME_METADATA_ID),
                Errors::IGAME_METADATA_NOT_SUPPORTED
            );
        }

        fn _assert_game_supports_erc721_interface(
            self: @ComponentState<TContractState>, src5_dispatcher: ISRC5Dispatcher
        ) {
            assert(src5_dispatcher.supports_interface(IERC721_ID), Errors::IERC721_NOT_SUPPORTED);
        }

        fn _assert_settings_exists(
            self: @ComponentState<TContractState>,
            store: Store,
            game: ContractAddress,
            settings_id: u32
        ) {
            let mut game_dispatcher = IGameDispatcher { contract_address: game };
            let settings_exist = game_dispatcher.get_settings_details(settings_id).exists;
            assert(settings_exist, Errors::GAME_SETTINGS_NOT_FOUND);
        }

        fn _assert_premium_token_registered(
            self: @ComponentState<TContractState>, token: Token
        ) {
            assert(self._is_token_registered(token), Errors::PREMIUM_TOKEN_NOT_REGISTERED);
        }

        fn _assert_premium_token_distribution_length_not_too_long(
            self: @ComponentState<TContractState>, distribution_length: u32, winners_count: u32
        ) {
            assert(distribution_length <= winners_count, Errors::PREMIUM_DISTRIBUTIONS_TOO_LONG);
        }

        fn _assert_premium_token_distribution_sum_is_100(
            self: @ComponentState<TContractState>, sum: u8
        ) {
            assert(sum == 100, Errors::PREMIUM_DISTRIBUTIONS_NOT_100);
        }

        fn _assert_prize_token_registered(
            self: @ComponentState<TContractState>, token: Token
        ) {
            assert(self._is_token_registered(token), Errors::PRIZE_TOKEN_NOT_REGISTERED);
        }

        fn _assert_within_registration_period(
            self: @ComponentState<TContractState>,
            registration_start_time: u64,
            registration_end_time: u64
        ) {
            assert(
                registration_start_time <= get_block_timestamp()
                    && registration_end_time >= get_block_timestamp(),
                Errors::NOT_WITHIN_REGISTRATION_PERIOD
            );
        }

        fn _assert_token_started(
            self: @ComponentState<TContractState>, state: Option<TournamentGameState>
        ) {
            match state {
                Option::Some(state) => {
                    assert(
                        state == TournamentGameState::Started
                            || state == TournamentGameState::Submitted,
                        Errors::GAME_NOT_STARTED
                    );
                },
                Option::None => { assert(false, Errors::GAME_NOT_STARTED); },
            }
        }

        fn _assert_score_valid(self: @ComponentState<TContractState>, score: u64) {
            assert(score > 0, Errors::INVALID_SCORE);
        }

        fn _assert_tournament_active(
            self: @ComponentState<TContractState>, tournament: @TournamentModel
        ) {
            let is_active = self._is_tournament_active(tournament);
            assert(is_active, Errors::TOURNAMENT_NOT_ACTIVE);
        }

        fn _assert_tournament_ended(self: @ComponentState<TContractState>, end_time: u64) {
            assert(end_time <= get_block_timestamp(), Errors::TOURNAMENT_NOT_ENDED);
        }

        fn _assert_tournament_not_ended(self: @ComponentState<TContractState>, end_time: u64) {
            assert(end_time > get_block_timestamp(), Errors::TOURNAMENT_ENDED);
        }

        fn _assert_tournament_period_within_max(
            self: @ComponentState<TContractState>, store: Store, tournament_id: u128
        ) {
            let tournament = store.get_tournament(tournament_id);
            assert(
                tournament.end_time - tournament.start_time < GAME_EXPIRATION_PERIOD.into(),
                Errors::TOURNAMENT_PERIOD_TOO_LONG
            );
        }

        fn _assert_tournament_finalized(self: @ComponentState<TContractState>, state: TournamentState) {
            assert(state == TournamentState::Finalized, Errors::TOURNAMENT_NOT_FINALIZED);
        }

        fn _assert_tournament_not_finalized(
            self: @ComponentState<TContractState>, state: TournamentState
        ) {
            assert(
                state != TournamentState::Finalized && state != TournamentState::Submitted,
                Errors::TOURNAMENT_ALREADY_FINALIZED
            );
        }

        fn _assert_scores_count_valid(
            self: @ComponentState<TContractState>,
            ref tournament: TournamentModel,
            scores_count: u32
        ) {
            assert(
                scores_count <= tournament.winners_count.into(), Errors::INVALID_SCORES_SUBMISSION
            );
        }

        fn _assert_prize_position_less_than_winners_count(
            self: @ComponentState<TContractState>, tournament: TournamentModel, position: u8
        ) {
            assert(position <= tournament.winners_count, Errors::PRIZE_POSITION_TOO_LARGE);
        }

        fn _assert_prize_exists(self: @ComponentState<TContractState>, token: ContractAddress) {
            assert(!token.is_zero(), Errors::PRIZE_DOES_NOT_EXIST);
        }

        fn _assert_prize_not_claimed(self: @ComponentState<TContractState>, claimed: bool) {
            assert(!claimed, Errors::PRIZE_ALREADY_CLAIMED);
        }

        fn _assert_payout_is_top_score(
            self: @ComponentState<TContractState>, payout_position: u8, top_score_ids: Span<u128>
        ) {
            assert(
                payout_position.into() <= top_score_ids.len(), Errors::PAYOUT_POSITION_NOT_TOP_SCORE
            );
        }

        fn _assert_payout_is_not_top_score(
            self: @ComponentState<TContractState>, payout_position: u8, top_score_ids: Span<u128>
        ) {
            assert(payout_position.into() > top_score_ids.len(), Errors::PAYOUT_POSITION_TOP_SCORE);
        }


        fn _assert_token_owner(
            self: @ComponentState<TContractState>,
            token: ContractAddress,
            token_id: u256,
            account: ContractAddress
        ) {
            let owner = self._get_owner(token, token_id);
            assert(owner == account, Errors::NOT_TOKEN_OWNER);
        }

        fn _assert_gated_token_owner(
            self: @ComponentState<TContractState>,
            token: ContractAddress,
            token_id: u256,
            account: ContractAddress
        ) {
            let owner = self._get_owner(token, token_id);
            assert(owner == account, Errors::NO_QUALIFYING_NFT);
        }

        fn _assert_game_token_owner(
            self: @ComponentState<TContractState>,
            tournament_id: u128,
            game_id: u256,
            account: ContractAddress
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS()
            );
            let mut store: Store = StoreTrait::new(world);
            let tournament = store.get_tournament(tournament_id);
            let owner = self._get_owner(tournament.game_address, game_id);
            assert(owner == account, Errors::NOT_GAME_OWNER);
        }

        fn _assert_gated_type_validates(
            self: @ComponentState<TContractState>, store: Store, gated_type: Option<GatedType>
        ) {
            match gated_type {
                Option::Some(gated_type) => {
                    match gated_type {
                        GatedType::token(token) => {
                            let token_model = store.get_token(token);
                            assert(
                                self._is_token_registered(token_model),
                                Errors::GATED_TOKEN_NOT_REGISTERED
                            )
                        },
                        GatedType::tournament(tournament_type) => {
                            match tournament_type {
                                TournamentType::winners(tournament_ids) => {
                                    let mut loop_index = 0;
                                    loop {
                                        if loop_index == tournament_ids.len() {
                                            break;
                                        }
                                        let tournament = store.get_tournament(*tournament_ids.at(loop_index));
                                        self
                                            ._assert_tournament_settled(tournament);
                                        loop_index += 1;
                                    }
                                },
                                TournamentType::participants(tournament_ids) => {
                                    let mut loop_index = 0;
                                    loop {
                                        if loop_index == tournament_ids.len() {
                                            break;
                                        }
                                        let tournament = store.get_tournament(*tournament_ids.at(loop_index));
                                        self
                                            ._assert_tournament_settled(tournament);
                                        loop_index += 1;
                                    }
                                },
                            }
                        },
                        GatedType::address(_) => {},
                    }
                },
                Option::None => {},
            }
        }

        fn _assert_tournament_settled(
            self: @ComponentState<TContractState>, tournament: @TournamentModel
        ) {
            assert(
                *tournament.end_time + *tournament.submission_period <= get_block_timestamp(),
                Errors::TOURNAMENT_NOT_SETTLED
            );
        }

        fn _assert_tournament_not_settled(
            self: @ComponentState<TContractState>, ref tournament: TournamentModel
        ) {
            assert(
                tournament.end_time + tournament.submission_period > get_block_timestamp(),
                Errors::TOURNAMENT_ALREADY_SETTLED
            );
        }

        fn _assert_prize_keys_not_empty(
            self: @ComponentState<TContractState>, prize_keys: Span<u64>
        ) {
            assert(prize_keys.len() > 0, Errors::NO_PRIZE_KEYS);
        }

        fn _assert_qualifies_gating(
            self: @ComponentState<TContractState>,
            store: Store,
            gated_type: Option<GatedType>,
            qualifying_token_id: Option<u256>,
            address: ContractAddress,
        ) {
            match gated_type {
                Option::Some(gated_type) => {
                    match gated_type {
                        GatedType::token(token) => {
                            self._assert_has_qualifying_nft(token, qualifying_token_id, address);
                        },
                        GatedType::tournament(tournament_type) => {
                            self
                                ._assert_has_qualified_in_tournaments(
                                    store, tournament_type, qualifying_token_id, address
                                );
                        },
                        GatedType::address(qualifying_addresses) => {
                            self._assert_qualifying_address(address, qualifying_addresses);
                        },
                    }
                },
                Option::None => {},
            };
        }

        fn _assert_has_qualifying_nft(
            self: @ComponentState<TContractState>,
            gated_token: ContractAddress,
            qualifying_token_id: Option<u256>,
            address: ContractAddress,
        ) {
            match qualifying_token_id {
                Option::Some(token_id) => {
                    self._assert_gated_token_owner(gated_token, token_id, address);
                },
                Option::None => { assert(false, Errors::NO_QUALIFYING_TOKEN_SUPPLIED); }
            }
        }

        fn _assert_has_qualified_in_tournaments(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_type: TournamentType,
            qualifying_token_id: Option<u256>,
            address: ContractAddress
        ) {
            match qualifying_token_id {
                Option::Some(token_id) => {
                    match tournament_type {
                        TournamentType::winners(tournament_ids) => {
                            let mut loop_index = 0;
                            let mut qualified = false;
                            loop {
                                if loop_index == tournament_ids.len() {
                                    break;
                                }
                                let tournament = store
                                    .get_tournament(*tournament_ids.at(loop_index).into());
                                let game_dispatcher = IGameDispatcher {
                                    contract_address: tournament.game_address
                                };
                                let owner = self._get_owner(tournament.game_address, token_id);
        
                                if owner == get_caller_address() {
                                    let state = store.get_tournament_token(token_id.low).state;
                                    match state {
                                        Option::Some(state) => {
                                            if state == TournamentGameState::Submitted {
                                                let score = game_dispatcher.get_score(token_id);
                                                self
                                                    ._is_top_score(
                                                        store, *tournament_ids.at(loop_index), score
                                                    );
                                                qualified = true;
                                            }
                                        },
                                        Option::None => {},
                                    }
                                }
                                loop_index += 1;
                            };
                            assert(qualified, Errors::GAME_DOES_NOT_QUALIFY);
                        },
                        TournamentType::participants(tournament_ids) => {
                            let mut loop_index = 0;
                            let mut participated = false;
                            loop {
                                if loop_index == tournament_ids.len() {
                                    break;
                                }
                                let tournament = store
                                    .get_tournament(*tournament_ids.at(loop_index).into());
                                let owner = self._get_owner(tournament.game_address, token_id);
        
                                if owner == get_caller_address() {
                                    let state = store.get_tournament_token(token_id.low).state;
                                    match state {
                                        Option::Some(state) => {
                                            if state == TournamentGameState::Submitted {
                                                participated = true;
                                            }
                                        },
                                        Option::None => {},
                                    }
                                }
                                loop_index += 1;
                            };
                            assert(participated, Errors::GAME_DID_NOT_PARTICIPATE);
                        },
                    }
                },
                Option::None => { assert(false, Errors::NO_QUALIFYING_TOKEN_SUPPLIED); }
            }
        }

        fn _assert_qualifying_address(
            self: @ComponentState<TContractState>,
            address: ContractAddress,
            qualifying_addresses: Span<ContractAddress>
        ) {
            let mut found = false;
            let mut loop_index = 0;
            loop {
                if loop_index == qualifying_addresses.len() {
                    break;
                }
                let qualifying_address = *qualifying_addresses.at(loop_index);
                if qualifying_address == address {
                    found = true;
                    break;
                }
                loop_index += 1;
            };
            assert(found, Errors::ADDRESS_DOES_NOT_QUALIFY);
        }

        //
        // INTERNALS
        //

        // TODO: add for V2 (only ERC721 tokens)
        // fn _register_tokens(
        //     ref self: ComponentState<TContractState>, ref store: Store, tokens: Array<Token>
        // ) {
        //     let num_tokens = tokens.len();
        //     let mut token_index = 0;
        //     let safe_mode = store.get_tournament_config(get_contract_address()).safe_mode;
        //     loop {
        //         if token_index == num_tokens {
        //             break;
        //         }
        //         let token = *tokens.at(token_index);

        // assert(
        //     !self._is_token_registered(ref store, token.token),
        //     Errors::TOKEN_ALREADY_REGISTERED
        // );

        //         let mut name = "";
        //         let mut symbol = "";

        //         match token.token_data_type.into() {
        //             TokenDataType::erc20(_) => {
        //                 let token_dispatcher = IERC20Dispatcher { contract_address: token.token
        //                 };
        //                 let token_dispatcher_metadata = IERC20MetadataDispatcher {
        //                     contract_address: token.token
        //                 };
        //                 name = token_dispatcher_metadata.name();
        //                 symbol = token_dispatcher_metadata.symbol();
        //                 // check that the contract is approved for the minimal amount
        //                 let allowance = token_dispatcher
        //                     .allowance(get_caller_address(), get_contract_address());
        //                 assert(allowance == 1, Errors::INVALID_TOKEN_ALLOWANCES);
        //                 // take a reading of the current balance (incase contract has assets
        //                 // already)
        //                 let current_balance =
        //                 token_dispatcher.balance_of(get_contract_address());
        //                 // trnsfer a minimal amount to the contract
        //                 token_dispatcher
        //                     .transfer_from(get_caller_address(), get_contract_address(), 1);
        //                 // take a reading of the new balance
        //                 let new_balance = token_dispatcher.balance_of(get_contract_address());
        //                 assert(new_balance == current_balance + 1,
        //                 Errors::INVALID_TOKEN_BALANCES);
        //                 // transfer back the minimal amount
        //                 token_dispatcher.transfer(get_caller_address(), 1);
        //                 // check the total supply is legitimate
        //                 let total_supply = token_dispatcher.total_supply();
        //                 assert(total_supply < TWO_POW_128.into(),
        //                 Errors::TOKEN_SUPPLY_TOO_LARGE);
        //             },
        //             TokenDataType::erc721(token_data_type) => {
        //                 let token_dispatcher = IERC721Dispatcher { contract_address: token.token
        //                 };
        //                 let token_dispatcher_metadata = IERC721MetadataDispatcher {
        //                     contract_address: token.token
        //                 };
        //                 name = token_dispatcher_metadata.name();
        //                 symbol = token_dispatcher_metadata.symbol();
        //                 // check that the contract is approved for the specific id
        //                 let approved = token_dispatcher
        //                     .get_approved(token_data_type.token_id.into());
        //                 assert(approved == get_contract_address(),
        //                 Errors::INVALID_TOKEN_APPROVALS);
        //                 // transfer a specific id to the contract
        //                 token_dispatcher
        //                     .transfer_from(
        //                         get_caller_address(),
        //                         get_contract_address(),
        //                         token_data_type.token_id.into()
        //                     );
        //                 // check the balance of the contract
        //                 let balance = token_dispatcher.balance_of(get_contract_address());
        //                 assert(balance == 1, Errors::INVALID_TOKEN_BALANCES);
        //                 let owner = token_dispatcher.owner_of(token_data_type.token_id.into());
        //                 assert(owner == get_contract_address(), Errors::INVALID_TOKEN_OWNER);
        //                 // transfer back the token
        //                 token_dispatcher
        //                     .transfer_from(
        //                         get_contract_address(),
        //                         get_caller_address(),
        //                         token_data_type.token_id.into()
        //                     );
        //             },
        //         }
        //         let token_model = TokenModel {
        //             token: token.token,
        //             name,
        //             symbol,
        //             token_data_type: token.token_data_type,
        //             is_registered: true
        //         };
        //         store.set_token(@token_model);
        //         token_index += 1;
        //     }
        // }

        fn _start_game(
            ref self: ComponentState<TContractState>,
            tournament: TournamentModel,
            tournament_token_id: u256
        ) -> u256 {
            let game_dispatcher = IGameDispatcher { contract_address: tournament.game_address };
            let owner = IERC721Dispatcher { contract_address: tournament.game_address }
                .owner_of(tournament_token_id);
            let game_id = game_dispatcher.new_game(tournament.settings_id, owner);
            game_id
        }

        fn _pay_premiums(
            ref self: ComponentState<TContractState>, entry_premium: Option<Premium>,
        ) {
            match entry_premium {
                Option::Some(premium) => {
                    let premium_dispatcher = IERC20Dispatcher { contract_address: premium.token };
                    premium_dispatcher
                        .transfer_from(
                            get_caller_address(),
                            get_contract_address(),
                            premium.token_amount.into()
                        );
                },
                Option::None => {},
            };
        }

        fn _mint_tournament_token(
            ref self: ComponentState<TContractState>, token_count: u128,
        ) -> u256 {
            let mut erc721 = get_dep_component_mut!(ref self, ERC721);
            let token_id = token_count.into();
            erc721.mint(get_caller_address(), token_id);
            token_id
        }

        fn _format_premium_config_into_prize_keys(
            ref self: ComponentState<TContractState>,
            ref store: Store,
            ref totals: TournamentTotals,
            tournament_id: u128
        ) {
            let mut tournament = store.get_tournament(tournament_id);
            match tournament.entry_premium {
                Option::Some(premium) => {
                    let total_entries = store.get_total_entries(tournament_id);
                    // first pay the creator fee
                    let token_dispatcher = IERC20Dispatcher { contract_address: premium.token };
                    let creator_amount = self
                        ._calculate_payout(
                            premium.creator_fee.into(),
                            total_entries.entry_count.into() * premium.token_amount
                        );
                    if creator_amount > 0 {
                        token_dispatcher.transfer(tournament.creator, creator_amount.into());
                    }

                    // then format the rest of the premium distributions into prize keys
                    let players_amount = (total_entries.entry_count.into() * premium.token_amount)
                        - creator_amount;
                    let player_distributions = premium.token_distribution;

                    let num_distributions = player_distributions.len();
                    let mut distribution_index = 0;
                    loop {
                        if distribution_index == num_distributions {
                            break;
                        }
                        let distribution_percentage = *player_distributions.at(distribution_index);
                        let distribution_amount = self
                            ._calculate_payout(distribution_percentage.into(), players_amount);

                        totals.prizes += 1;
                        let prize = TournamentPrize {
                            tournament_id,
                            prize_key: totals.prizes,
                            token: premium.token,
                            token_data_type: TokenDataType::erc20(
                                ERC20Data { token_amount: distribution_amount }
                            ),
                            payout_position: (distribution_index + 1).try_into().unwrap(),
                            claimed: false
                        };
                        store.set_prize(@prize);
                        distribution_index += 1;
                    };
                },
                Option::None => {}
            }
        }
        fn _update_tournament_scores(
            ref self: ComponentState<TContractState>,
            store: Store,
            tournament_id: u128,
            game_id: u256,
            score: u64,
            ref new_score_ids: Array<u128>,
            game_index: u32
        ) {
            // get current scores which will be mutated as part of this function
            let top_score_ids = store.get_tournament_scores(tournament_id).top_score_ids;

            let num_scores = top_score_ids.len();

            let mut new_score_id: u128 = 0;
            let mut new_score: u64 = 0;

            if num_scores == 0 {
                new_score_id = game_id.try_into().unwrap();
                new_score = score;
            } else {
                if (game_index < num_scores) {
                    let top_score_id = *top_score_ids.at(game_index);
                    let top_score = self
                        .get_score_from_id(store, tournament_id, top_score_id.try_into().unwrap());
                    if (score > top_score) {
                        new_score_id = game_id.try_into().unwrap();
                        new_score = score;
                    } else {
                        new_score_id = top_score_id;
                        new_score = top_score;
                    }
                } else {
                    new_score_id = game_id.try_into().unwrap();
                    new_score = score;
                }
            }
            new_score_ids.append(new_score_id);
        }

        fn _deposit_prize(
            ref self: ComponentState<TContractState>,
            tournament_id: u128,
            token: ContractAddress,
            token_data_type: TokenDataType,
            position: u8
        ) {
            match token_data_type {
                TokenDataType::erc20(token_data) => {
                    let token_dispatcher = IERC20Dispatcher { contract_address: token };
                    assert(token_data.token_amount > 0, Errors::INVALID_TOKEN_AMOUNT);
                    token_dispatcher
                        .transfer_from(
                            get_caller_address(),
                            get_contract_address(),
                            token_data.token_amount.into()
                        );
                },
                TokenDataType::erc721(token_data) => {
                    let token_dispatcher = IERC721Dispatcher { contract_address: token };
                    self
                        ._assert_token_owner(
                            token, token_data.token_id.into(), get_caller_address()
                        );
                    token_dispatcher
                        .transfer_from(
                            get_caller_address(), get_contract_address(), token_data.token_id.into()
                        );
                },
            }
        }

        fn _distribute_prize_to_creator(
            ref self: ComponentState<TContractState>,
            prize: TournamentPrize,
            creator: ContractAddress
        ) {
            match prize.token_data_type {
                TokenDataType::erc20(token_data) => {
                    let token_dispatcher = IERC20Dispatcher { contract_address: prize.token };
                    token_dispatcher.transfer(creator, token_data.token_amount.into());
                },
                TokenDataType::erc721(token_data) => {
                    let token_dispatcher = IERC721Dispatcher { contract_address: prize.token };
                    token_dispatcher
                        .transfer_from(get_contract_address(), creator, token_data.token_id.into());
                },
            }
        }

        fn _distribute_prize_to_top_score(
            ref self: ComponentState<TContractState>,
            prize: TournamentPrize,
            address: ContractAddress
        ) {
            match prize.token_data_type {
                TokenDataType::erc20(token_data) => {
                    let token_dispatcher = IERC20Dispatcher { contract_address: prize.token };
                    assert(token_data.token_amount > 0, Errors::INVALID_TOKEN_AMOUNT);
                    token_dispatcher.transfer(address, token_data.token_amount.into());
                },
                TokenDataType::erc721(token_data) => {
                    let token_dispatcher = IERC721Dispatcher { contract_address: prize.token };
                    token_dispatcher
                        .transfer_from(get_contract_address(), address, token_data.token_id.into());
                }
            }
        }

        fn _calculate_payout(
            ref self: ComponentState<TContractState>, bp: u128, total_value: u128
        ) -> u128 {
            (bp * total_value) / 100
        }
    }
}
