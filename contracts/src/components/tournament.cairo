use starknet::ContractAddress;
use tournaments::components::models::tournament::{
    Tournament as TournamentModel, GatedType, Premium, TokenDataType, TokenMetadata,
};

///
/// Interface
///

#[starknet::interface]
trait ITournament<TState> {
    fn total_tournaments(self: @TState) -> u64;
    fn tournament(self: @TState, tournament_id: u64) -> TournamentModel;
    fn tournament_token(self: @TState, token_id: u64) -> TokenMetadata;
    fn tournament_entries(self: @TState, tournament_id: u64) -> u32;
    fn is_token_registered(self: @TState, address: ContractAddress) -> bool;
    fn register_token(ref self: TState, address: ContractAddress, token_data: TokenDataType);
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
        settings_id: u32,
    ) -> (u64, u64);
    fn enter_tournament(
        ref self: TState, tournament_id: u64, qualifying_token_id: Option<u256>,
    ) -> (u64, TokenMetadata);
    fn start_game(ref self: TState, tournament_token_id: u64);
    fn submit_scores(ref self: TState, tournament_id: u64, token_ids: Array<u64>);
    fn finalize_tournament(ref self: TState, tournament_id: u64);
    fn distribute_prize(ref self: TState, prize_id: u64);
    fn distribute_unclaimable_prize(ref self: TState, prize_id: u64);
    fn add_prize(
        ref self: TState,
        tournament_id: u64,
        token: ContractAddress,
        token_data_type: TokenDataType,
        position: u8,
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
        TWO_POW_128, MIN_REGISTRATION_PERIOD, MAX_REGISTRATION_PERIOD, MIN_TOURNAMENT_LENGTH,
        MAX_TOURNAMENT_LENGTH, MIN_SUBMISSION_PERIOD, MAX_SUBMISSION_PERIOD,
        TEST_MIN_REGISTRATION_PERIOD, TEST_MIN_SUBMISSION_PERIOD, TEST_MIN_TOURNAMENT_LENGTH,
        DEFAULT_NS, VERSION,
    };
    use tournaments::components::interfaces::{
        IGameDispatcher, IGameDispatcherTrait, IGAME_ID, IGAME_METADATA_ID,
    };
    use tournaments::components::models::tournament::{
        Tournament as TournamentModel, TokenMetadata, TournamentState, GameState, TournamentScores,
        Prize, Token, TournamentConfig, TokenDataType, GatedType, TournamentType, Premium,
        ERC20Data, ERC721Data,
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
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            store.get_platform_metrics(VERSION).total_tournaments
        }
        fn tournament(
            self: @ComponentState<TContractState>, tournament_id: u64,
        ) -> TournamentModel {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            store.get_tournament(tournament_id)
        }
        fn tournament_token(self: @ComponentState<TContractState>, token_id: u64) -> TokenMetadata {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            store.get_token_metadata(token_id)
        }
        fn tournament_entries(self: @ComponentState<TContractState>, tournament_id: u64) -> u32 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
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
            token_data: TokenDataType,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), @"tournament",
            );
            let mut store: Store = StoreTrait::new(world);
            let safe_mode = store.get_tournament_config(VERSION).safe_mode;
            let token_model = store.get_token(address);
            assert!(!safe_mode, "Tournament: Cannot register token as safe mode is enabled");
            self._assert_token_registered(token_model);
            let (name, symbol) = self._register_token(address, token_data);
            let token_model = Token {
                address, name, symbol, token_data_type: token_data, is_registered: true,
            };
            store.set_token(@token_model);
        }

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
        /// @return A tuple containing the tournament id and the tournament token id.
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
            settings_id: u32,
        ) -> (u64, u64) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let test_mode = store.get_tournament_config(VERSION).test_mode;

            self._assert_future_start_time(registration_start_time, start_time);
            self
                ._assert_bigger_than_min_registration_period(
                    test_mode, registration_start_time, registration_end_time,
                );
            self
                ._assert_less_than_max_registration_period(
                    registration_start_time, registration_end_time,
                );
            self
                ._assert_registration_start_not_after_tournament_start(
                    registration_start_time, start_time,
                );
            self._assert_registration_end_not_after_tournament_end(registration_end_time, end_time);
            self._assert_tournament_length_not_too_short(test_mode, end_time, start_time);
            self._assert_tournament_length_not_too_long(end_time, start_time);
            self._assert_submission_period_larger_than_minimum(test_mode, submission_period);
            self._assert_submission_period_less_than_maximum(submission_period);
            self._assert_winners_count_greater_than_zero(winners_count);
            self._assert_gated_type_validates(store, gated_type);
            self
                ._assert_premium_token_registered_and_distribution_valid(
                    store, entry_premium.clone(), winners_count,
                );

            let src5_dispatcher = ISRC5Dispatcher { contract_address: game_address };
            self._assert_game_supports_game_interface(src5_dispatcher, game_address);
            self._assert_game_supports_game_metadata_interface(src5_dispatcher, game_address);
            self._assert_game_supports_erc721_interface(src5_dispatcher, game_address);

            self._assert_settings_exists(game_address, settings_id);

            // increment and get the next tournament id
            let tournament_id = store.increment_and_get_tournament_count();

            // create and store tournament
            store
                .set_tournament(
                    @TournamentModel {
                        tournament_id,
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
                    },
                );

            // mint a tournament token to the creator
            let token_id = self._mint_tournament_token(ref store);

            // and associate it with the tournament as entry #0
            store
                .set_token_metadata(
                    @TokenMetadata {
                        token_id,
                        tournament_id,
                        game_token_id: 0,
                        state: Option::None,
                        entry_number: 0,
                    },
                );

            (tournament_id, token_id)
        }

        /// @title Enter tournament
        /// @notice Allows a player to enter a tournament for a particular tournament id.
        /// @dev Requires a tournament to have already been created.
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        /// @param qualifying_token_id A Option<u256> representing the token id
        /// @return A tuple containing the tournament token id and the tournament token metadata.
        fn enter_tournament(
            ref self: ComponentState<TContractState>,
            tournament_id: u64,
            qualifying_token_id: Option<u256>,
        ) -> (u64, TokenMetadata) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);
            self
                ._assert_within_registration_period(
                    tournament.registration_start_time, tournament.registration_end_time,
                );

            self
                ._assert_token_satisfies_gate(
                    store, tournament.gated_type, qualifying_token_id, get_caller_address(),
                );

            self._pay_premiums(tournament.entry_premium);

            // mint tournament token for the entrant
            let token_id = self._mint_tournament_token(ref store);

            // increment and get entry count for the tournament
            let entry_number = store.increment_and_get_tournament_entry_count(tournament_id);

            // attach metadata to the tournament token and save it
            let token_metadata = TokenMetadata {
                token_id,
                tournament_id,
                game_token_id: 0,
                entry_number,
                state: Option::Some(GameState::Registered),
            };
            store.set_token_metadata(@token_metadata);

            // if tournament is still in pre-registration, update to registration
            if (tournament.state == TournamentState::PreRegistration) {
                tournament.state = TournamentState::Registration;
                store.set_tournament(@tournament);
            }

            // return tournament token id and metadata
            (token_id, token_metadata)
        }

        /// @title Start tournament
        /// @notice Allows a player to start a tournament for a particular tournament id.
        /// @dev Requires the player starting to have already entered.
        /// @param self A reference to the ContractState object.
        /// @param tournament_token_id A u64 representing the unique ID of the tournament token.
        fn start_game(ref self: ComponentState<TContractState>, tournament_token_id: u64) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);

            let mut token_metadata = store.get_token_metadata(tournament_token_id);
            let mut tournament = store.get_tournament(token_metadata.tournament_id);
            self._assert_tournament_active(@tournament);
            self._assert_game_not_started(@token_metadata);

            // mint a new game token to the owner of the tournament token
            let game_token_id = self._mint_and_distribute_game(@tournament, tournament_token_id);

            // update the token metadata with the new game token id
            token_metadata.game_token_id = game_token_id;

            // update the token metadata with the new game state
            token_metadata.state = Option::Some(GameState::Started);

            // save updated token metadata
            store.set_token_metadata(@token_metadata);

            // update tournament state if not already active
            if tournament.state != TournamentState::Active {
                tournament.state = TournamentState::Active;
                store.set_tournament(@tournament);
            }
        }

        /// @title Finalize tournament
        /// @notice Allows anyone to finalize a tournament for a particular tournament
        /// id.
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        fn finalize_tournament(ref self: ComponentState<TContractState>, tournament_id: u64) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);

            self._assert_tournament_not_finalized(tournament.state, tournament_id);
            self._assert_tournament_ended(tournament.end_time, tournament_id);

            self._convert_premiums_into_prizes(ref store, tournament_id);

            tournament.state = TournamentState::Finalized;
            store.set_tournament(@tournament);
        }

        /// @title Submit scores
        /// @notice Allows anyone to submit scores for a tournament for a particular tournament id.
        /// @dev For more efficient gas we assume that the game ids are in order of highest score
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        /// @param token_ids An array of u64 representing the token ids to submit.
        fn submit_scores(
            ref self: ComponentState<TContractState>, tournament_id: u64, token_ids: Array<u64>,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);

            self._assert_tournament_finalized(tournament.state, tournament_id);
            self._assert_scores_count_valid(@tournament, token_ids.len());
            self._assert_tournament_not_settled(@tournament);

            let mut game_dispatcher = IGameDispatcher { contract_address: tournament.game_address };

            // loop through game ids and update scores
            let mut num_games = token_ids.len();
            let mut token_index = 0;
            let mut top_score_token_ids = ArrayTrait::<u64>::new();
            loop {
                if token_index == num_games {
                    break;
                }
                let token_id = *token_ids.at(token_index);
                let mut token_metadata = store.get_token_metadata(token_id);

                self._assert_game_started(token_metadata.state, token_id);

                let score = game_dispatcher.get_score(token_metadata.game_token_id);
                self._assert_score_valid(score, token_id);

                top_score_token_ids
                    .append(
                        self
                            ._update_tournament_scores(
                                store, tournament_id, token_id, score, token_index,
                            ),
                    );

                // set tournament token state to ScoreSubmitted
                token_metadata.state = Option::Some(GameState::ScoreSubmitted);

                // save updated token metadata
                store.set_token_metadata(@token_metadata);

                // increment token index
                token_index += 1;
            };

            store
                .set_tournament_scores(
                    @TournamentScores {
                        tournament_id, top_score_token_ids: top_score_token_ids.span(),
                    },
                );
        }

        /// @title Distribute prize
        /// @notice Allows anyone to distribute the prize to a top score for a particular prize key.
        /// @param self A reference to the ContractState object.
        /// @param prize_id A u64 representing the prize key to distribute.
        fn distribute_prize(ref self: ComponentState<TContractState>, prize_id: u64) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);

            let mut prize = store.get_prize(prize_id);
            let mut tournament = store.get_tournament(prize.tournament_id);

            self._assert_tournament_finalized(tournament.state, prize.tournament_id);
            self._assert_tournament_settled(@tournament);
            self._assert_prize_exists(prize.token, prize_id);
            self._assert_prize_not_claimed(prize.claimed, prize_id);

            let top_score_token_ids = store
                .get_tournament_scores(prize.tournament_id)
                .top_score_token_ids;
            self._assert_payout_is_top_score(prize.payout_position, top_score_token_ids.clone());

            let payout_token_id = *top_score_token_ids.at(prize.payout_position.into() - 1);
            let payout_game_id = store.get_token_metadata(payout_token_id).game_token_id;
            let payout_position_address = self
                ._get_owner(tournament.game_address, payout_game_id.into());

            self._distribute_prize_to_top_score(prize, payout_position_address);

            prize.claimed = true;
            store.set_prize(@prize);

            if (tournament.state != TournamentState::ScoreSubmitted) {
                tournament.state = TournamentState::ScoreSubmitted;
                store.set_tournament(@tournament);
            }
        }

        /// @title Distribute unclaimable prize
        /// @notice Allows anyone to distribute the prize to the creator of the tournament.
        /// @param self A reference to the ContractState object.
        /// @param prize_id A u64 representing the prize key to distribute.
        fn distribute_unclaimable_prize(ref self: ComponentState<TContractState>, prize_id: u64) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);

            let mut prize = store.get_prize(prize_id);
            let mut tournament = store.get_tournament(prize.tournament_id);

            self._assert_tournament_finalized(tournament.state, prize.tournament_id);
            self._assert_tournament_settled(@tournament);
            self._assert_prize_exists(prize.token, prize_id);
            self._assert_prize_not_claimed(prize.claimed, prize_id);

            let top_score_token_ids = store
                .get_tournament_scores(prize.tournament_id)
                .top_score_token_ids;
            self._assert_payout_is_not_top_score(prize.payout_position, top_score_token_ids);

            self._distribute_prize_to_creator(prize, tournament.creator);

            prize.claimed = true;
            store.set_prize(@prize);

            if (tournament.state != TournamentState::ScoreSubmitted) {
                tournament.state = TournamentState::ScoreSubmitted;
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
        /// @return A u64 representing the unique ID of the prize.
        fn add_prize(
            ref self: ComponentState<TContractState>,
            tournament_id: u64,
            token: ContractAddress,
            token_data_type: TokenDataType,
            position: u8,
        ) -> u64 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);
            let token_model = store.get_token(token);

            self._assert_tournament_not_ended(tournament.end_time, tournament_id);
            self._assert_prize_token_registered(token_model);
            self._assert_prize_position_less_than_winners_count(@tournament, position);
            self._deposit_prize(tournament_id, token, token_data_type, position);

            // increment and get prize count
            let prize_id = store.increment_and_get_prize_count();

            // create and save new prize
            store
                .set_prize(
                    @Prize {
                        prize_id,
                        tournament_id,
                        token,
                        token_data_type,
                        payout_position: position,
                        claimed: false,
                    },
                );

            // return prize key
            prize_id
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

            let token_data_type = TokenDataType::erc20(ERC20Data { token_amount: 1 });
            let new_erc20_token = @Token {
                address, name, symbol, token_data_type, is_registered: true,
            };
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

            let token_data_type = TokenDataType::erc721(ERC721Data { token_id: 1 });
            let new_erc721_token = @Token {
                address, name, symbol, token_data_type, is_registered: true,
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
            let game_dispatcher = IGameDispatcher { contract_address: tournament.game_address };
            game_dispatcher.get_score(token_id)
        }

        fn _get_owner(
            self: @ComponentState<TContractState>, token: ContractAddress, token_id: u256,
        ) -> ContractAddress {
            IERC721Dispatcher { contract_address: token }.owner_of(token_id)
        }

        fn _is_tournament_active(
            self: @ComponentState<TContractState>, tournament: @TournamentModel,
        ) -> bool {
            *tournament.start_time <= get_block_timestamp()
                && *tournament.end_time > get_block_timestamp()
        }

        fn _is_token_registered(self: @ComponentState<TContractState>, token: @Token) -> bool {
            *token.is_registered
        }

        fn _is_top_score(
            self: @ComponentState<TContractState>, store: Store, tournament_id: u64, score: u64,
        ) -> bool {
            let top_score_token_ids = store
                .get_tournament_scores(tournament_id)
                .top_score_token_ids;
            let num_scores = top_score_token_ids.len();

            if num_scores == 0 {
                return true;
            }

            let last_place_id = *top_score_token_ids.at(num_scores - 1);
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

        fn _assert_future_start_time(
            self: @ComponentState<TContractState>, registration_start_time: u64, start_time: u64,
        ) {
            assert!(
                registration_start_time >= get_block_timestamp(),
                "Tournament: Registration time {} is not in the future.",
                registration_start_time,
            );
            assert!(
                start_time >= get_block_timestamp(),
                "Tournament: Start time {} is not in the future.",
                start_time,
            );
        }

        fn _assert_bigger_than_min_registration_period(
            self: @ComponentState<TContractState>,
            test_mode: bool,
            registration_start_time: u64,
            registration_end_time: u64,
        ) {
            let min_registration_period = if test_mode {
                TEST_MIN_REGISTRATION_PERIOD
            } else {
                MIN_REGISTRATION_PERIOD
            };
            assert!(
                registration_end_time - registration_start_time >= min_registration_period.into(),
                "Tournament: Registration period of {} lower than minimum {}",
                registration_end_time - registration_start_time,
                min_registration_period,
            );
        }

        fn _assert_less_than_max_registration_period(
            self: @ComponentState<TContractState>,
            registration_start_time: u64,
            registration_end_time: u64,
        ) {
            assert!(
                registration_end_time - registration_start_time < MAX_REGISTRATION_PERIOD.into(),
                "Tournament: Registration period of {} higher than maximum {}",
                registration_end_time - registration_start_time,
                MAX_REGISTRATION_PERIOD,
            );
        }

        fn _assert_registration_start_not_after_tournament_start(
            self: @ComponentState<TContractState>,
            registration_start_time: u64,
            tournament_start_time: u64,
        ) {
            assert!(
                registration_start_time <= tournament_start_time,
                "Tournament: Registration start time {} is not before tournament start time {}",
                registration_start_time,
                tournament_start_time,
            );
        }

        fn _assert_registration_end_not_after_tournament_end(
            self: @ComponentState<TContractState>,
            registration_end_time: u64,
            tournament_end_time: u64,
        ) {
            assert!(
                registration_end_time <= tournament_end_time,
                "Tournament: Registration end time {} is not before tournament end time {}",
                registration_end_time,
                tournament_end_time,
            );
        }

        fn _assert_tournament_length_not_too_short(
            self: @ComponentState<TContractState>, test_mode: bool, end_time: u64, start_time: u64,
        ) {
            let min_tournament_length = if test_mode {
                TEST_MIN_TOURNAMENT_LENGTH
            } else {
                MIN_TOURNAMENT_LENGTH
            };
            assert!(
                end_time - start_time >= min_tournament_length.into(),
                "Tournament: Tournament period of {} lower than minimum {}",
                end_time - start_time,
                min_tournament_length,
            );
        }

        fn _assert_tournament_length_not_too_long(
            self: @ComponentState<TContractState>, end_time: u64, start_time: u64,
        ) {
            assert!(
                end_time - start_time <= MAX_TOURNAMENT_LENGTH.into(),
                "Tournament: Tournament period of {} higher than maximum {}",
                end_time - start_time,
                MAX_TOURNAMENT_LENGTH,
            );
        }

        fn _assert_submission_period_larger_than_minimum(
            self: @ComponentState<TContractState>, test_mode: bool, submission_period: u64,
        ) {
            let min_submission_period = if test_mode {
                TEST_MIN_SUBMISSION_PERIOD
            } else {
                MIN_SUBMISSION_PERIOD
            };
            assert!(
                submission_period >= min_submission_period.into(),
                "Tournament: Submission period of {} lower than the minimum {}",
                submission_period,
                min_submission_period,
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
            self: @ComponentState<TContractState>, winners_count: u8,
        ) {
            assert!(winners_count > 0, "Tournament: Winners count must be greater than zero");
        }

        fn _assert_premium_token_registered_and_distribution_valid(
            self: @ComponentState<TContractState>,
            store: Store,
            premium: Option<Premium>,
            winners_count: u8,
        ) {
            match premium {
                Option::Some(token) => {
                    let token_model = store.get_token(token.token_address);
                    self._assert_premium_token_registered(token_model);
                    self
                        ._assert_premium_token_distribution_length_not_too_long(
                            token.token_distribution.len(), winners_count.into(),
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
            self: @ComponentState<TContractState>,
            src5_dispatcher: ISRC5Dispatcher,
            game_address: ContractAddress,
        ) {
            let game_address: felt252 = game_address.into();
            assert!(
                src5_dispatcher.supports_interface(IGAME_ID),
                "Tournament: Game address {} does not support IGame interface",
                game_address,
            );
        }

        fn _assert_game_supports_game_metadata_interface(
            self: @ComponentState<TContractState>,
            src5_dispatcher: ISRC5Dispatcher,
            game_address: ContractAddress,
        ) {
            let game_address: felt252 = game_address.into();
            assert!(
                src5_dispatcher.supports_interface(IGAME_METADATA_ID),
                "Tournament: Game address {} does not support IGameMetadata interface",
                game_address,
            );
        }

        fn _assert_game_supports_erc721_interface(
            self: @ComponentState<TContractState>,
            src5_dispatcher: ISRC5Dispatcher,
            game_address: ContractAddress,
        ) {
            let game_address: felt252 = game_address.into();
            assert!(
                src5_dispatcher.supports_interface(IERC721_ID),
                "Tournament: Game address {} does not support IERC721 interface",
                game_address,
            );
        }

        fn _assert_settings_exists(
            self: @ComponentState<TContractState>, game: ContractAddress, settings_id: u32,
        ) {
            let mut game_dispatcher = IGameDispatcher { contract_address: game };
            let settings_exist = game_dispatcher.get_settings_details(settings_id).exists;
            let game_address: felt252 = game.into();
            assert!(
                settings_exist,
                "Tournament: Settings id {} is not found on game address {}",
                settings_id,
                game_address,
            );
        }

        fn _assert_premium_token_registered(self: @ComponentState<TContractState>, token: Token) {
            let token_address: felt252 = token.address.into();
            assert!(
                self._is_token_registered(@token),
                "Tournament: Premium token address {} is not registered",
                token_address,
            );
        }

        fn _assert_premium_token_distribution_length_not_too_long(
            self: @ComponentState<TContractState>, distribution_length: u32, winners_count: u32,
        ) {
            assert!(
                distribution_length <= winners_count,
                "Tournament: Premium distribution list is {} longer than the winners count {}",
                distribution_length,
                winners_count,
            );
        }

        fn _assert_premium_token_distribution_sum_is_100(
            self: @ComponentState<TContractState>, sum: u8,
        ) {
            assert!(sum == 100, "Tournament: Premium distribution sum is not 100%");
        }

        fn _assert_prize_token_registered(self: @ComponentState<TContractState>, token: Token) {
            let token_address: felt252 = token.address.into();
            assert!(
                self._is_token_registered(@token),
                "Tournament: Prize token address {} is not registered",
                token_address,
            );
        }

        fn _assert_within_registration_period(
            self: @ComponentState<TContractState>,
            registration_start_time: u64,
            registration_end_time: u64,
        ) {
            assert!(
                registration_start_time <= get_block_timestamp()
                    && registration_end_time >= get_block_timestamp(),
                "Tournament: Entry time is not within the registration period {} to {}",
                registration_start_time,
                registration_end_time,
            );
        }

        fn _assert_game_started(
            self: @ComponentState<TContractState>, state: Option<GameState>, token_id: u64,
        ) {
            match state {
                Option::Some(state) => {
                    assert!(
                        state == GameState::Started || state == GameState::ScoreSubmitted,
                        "Tournament: Game on token id {} is not started",
                        token_id,
                    );
                },
                Option::None => { assert!(false, "Tournament: Game is not started"); },
            }
        }

        fn _assert_game_not_started(
            self: @ComponentState<TContractState>, token_metadata: @TokenMetadata,
        ) {
            match token_metadata.state {
                Option::Some(state) => {
                    assert!(
                        *state == GameState::Registered,
                        "Tournament: Game on token id {} is already started",
                        token_metadata.token_id,
                    );
                },
                Option::None => {},
            }
        }

        fn _assert_score_valid(self: @ComponentState<TContractState>, score: u64, token_id: u64) {
            assert!(score > 0, "Tournament: Score on token id {} must be greater than 0", token_id);
        }

        fn _assert_tournament_active(
            self: @ComponentState<TContractState>, tournament: @TournamentModel,
        ) {
            let is_active = self._is_tournament_active(tournament);
            assert!(
                is_active, "Tournament: Tournament id {} is not active", tournament.tournament_id,
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

        fn _assert_tournament_finalized(
            self: @ComponentState<TContractState>, state: TournamentState, tournament_id: u64,
        ) {
            assert!(
                state == TournamentState::Finalized || state == TournamentState::ScoreSubmitted,
                "Tournament: Tournament id {} is not finalized",
                tournament_id,
            );
        }

        fn _assert_tournament_not_finalized(
            self: @ComponentState<TContractState>, state: TournamentState, tournament_id: u64,
        ) {
            assert!(
                state != TournamentState::Finalized && state != TournamentState::ScoreSubmitted,
                "Tournament: Tournament id {} is already finalized",
                tournament_id,
            );
        }

        fn _assert_scores_count_valid(
            self: @ComponentState<TContractState>, tournament: @TournamentModel, scores_count: u32,
        ) {
            let winners_count = *tournament.winners_count;
            assert!(
                scores_count <= winners_count.into(),
                "Tournament: The length of scores submissions {} is greater than the winners count {}",
                scores_count,
                winners_count,
            );
        }

        fn _assert_prize_position_less_than_winners_count(
            self: @ComponentState<TContractState>, tournament: @TournamentModel, position: u8,
        ) {
            assert!(
                position <= *tournament.winners_count,
                "Tournament: Prize position {} is greater than the winners count {}",
                position,
                *tournament.winners_count,
            );
        }

        fn _assert_prize_exists(
            self: @ComponentState<TContractState>, token: ContractAddress, prize_id: u64,
        ) {
            assert!(!token.is_zero(), "Tournament: Prize key {} does not exist", prize_id);
        }

        fn _assert_prize_not_claimed(
            self: @ComponentState<TContractState>, claimed: bool, prize_id: u64,
        ) {
            assert!(!claimed, "Tournament: Prize key {} has already been claimed", prize_id);
        }

        fn _assert_payout_is_top_score(
            self: @ComponentState<TContractState>,
            payout_position: u8,
            top_score_token_ids: Span<u64>,
        ) {
            assert!(
                payout_position.into() <= top_score_token_ids.len(),
                "Tournament: Prize payout position {} is not a top score",
                payout_position,
            );
        }

        fn _assert_payout_is_not_top_score(
            self: @ComponentState<TContractState>,
            payout_position: u8,
            top_score_token_ids: Span<u64>,
        ) {
            assert!(
                payout_position.into() > top_score_token_ids.len(),
                "Tournament: Prize payout position {} is a top score",
                payout_position,
            );
        }


        fn _assert_token_owner(
            self: @ComponentState<TContractState>,
            token: ContractAddress,
            token_id: u256,
            account: ContractAddress,
        ) {
            let owner = self._get_owner(token, token_id);
            assert!(owner == account, "Tournament: Caller does not own token id {}", token_id);
        }

        fn _assert_gated_token_owner(
            self: @ComponentState<TContractState>,
            token: ContractAddress,
            token_id: u256,
            account: ContractAddress,
        ) {
            let owner = self._get_owner(token, token_id);
            assert!(
                owner == account,
                "Tournament: Caller does not own qualifying token id {}",
                token_id,
            );
        }

        fn _assert_gated_type_validates(
            self: @ComponentState<TContractState>, store: Store, gated_type: Option<GatedType>,
        ) {
            match gated_type {
                Option::Some(gated_type) => {
                    match gated_type {
                        GatedType::token(token) => {
                            let token_model = store.get_token(token);
                            let token_address: felt252 = token.into();
                            assert!(
                                self._is_token_registered(@token_model),
                                "Tournament: Gated token address {} is not registered",
                                token_address,
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
                                        let tournament = store
                                            .get_tournament(*tournament_ids.at(loop_index));
                                        self._assert_tournament_settled(@tournament);
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
                                        self._assert_tournament_settled(@tournament);
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
            self: @ComponentState<TContractState>, tournament: @TournamentModel,
        ) {
            assert!(
                *tournament.end_time + *tournament.submission_period <= get_block_timestamp(),
                "Tournament: Tournament id {} is not settled",
                tournament.tournament_id,
            );
        }

        fn _assert_tournament_not_settled(
            self: @ComponentState<TContractState>, tournament: @TournamentModel,
        ) {
            assert!(
                *tournament.end_time + *tournament.submission_period > get_block_timestamp(),
                "Tournament: Tournament id {} is already settled",
                tournament.tournament_id,
            );
        }

        fn _assert_token_satisfies_gate(
            self: @ComponentState<TContractState>,
            store: Store,
            gated_type: Option<GatedType>,
            qualifying_token_id: Option<u256>,
            address: ContractAddress,
        ) {
            match gated_type {
                Option::Some(gated_type) => {
                    match gated_type {
                        // NFT ownership gate
                        GatedType::token(token_address) => {
                            match qualifying_token_id {
                                Option::Some(token_id) => {
                                    self
                                        ._assert_gated_token_owner(
                                            token_address, token_id, address,
                                        );
                                },
                                Option::None => {
                                    assert!(
                                        false,
                                        "Tournament: token id of qualifying tournament is required to register",
                                    );
                                },
                            }
                        },
                        // Previous tournament participation gate
                        GatedType::tournament(tournament_type) => {
                            match qualifying_token_id {
                                Option::Some(token_id) => {
                                    self
                                        ._assert_has_qualified_in_tournaments(
                                            store,
                                            tournament_type,
                                            token_id.try_into().unwrap(),
                                            address,
                                        );
                                },
                                Option::None => {
                                    assert!(false, "Tournament: No qualifying token id supplied");
                                },
                            }
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
            token_address: ContractAddress,
            token_id: u256,
            address: ContractAddress,
        ) {
            self._assert_gated_token_owner(token_address, token_id, address);
        }

        // TODO: Instead of looping through all qualifying tournaments, the caller should pass in
        // the tournament ID they are qualifying with.
        // This will simplify this code to an assertion that the tournament ID is part of the set ofqualifying
        // tournament IDs and an assertion that the caller owns the qualifying token id.
        fn _assert_has_qualified_in_tournaments(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_type: TournamentType,
            token_id: u64,
            address: ContractAddress,
        ) {
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
                            contract_address: tournament.game_address,
                        };
                        let token = store.get_token_metadata(token_id);
                        let game_id = token.game_token_id;
                        let owner = self._get_owner(tournament.game_address, game_id.into());

                        if owner == get_caller_address() {
                            match token.state {
                                Option::Some(state) => {
                                    if state == GameState::ScoreSubmitted {
                                        let score = game_dispatcher.get_score(game_id);
                                        self
                                            ._is_top_score(
                                                store, *tournament_ids.at(loop_index), score,
                                            );
                                        qualified = true;
                                    }
                                },
                                Option::None => {},
                            }
                        }
                        loop_index += 1;
                    };
                    assert!(
                        qualified,
                        "Tournament: ScoreSubmitted tournament token id {} is not a top score in any gated tournament",
                        token_id,
                    );
                },
                TournamentType::participants(tournament_ids) => {
                    let mut loop_index = 0;
                    let mut participated = false;
                    loop {
                        if loop_index == tournament_ids.len() {
                            break;
                        }
                        let tournament = store.get_tournament(*tournament_ids.at(loop_index));
                        let owner = self._get_owner(tournament.game_address, token_id.into());

                        if owner == get_caller_address() {
                            let state = store.get_token_metadata(token_id).state;
                            match state {
                                Option::Some(state) => {
                                    if state == GameState::ScoreSubmitted {
                                        participated = true;
                                    }
                                },
                                Option::None => {},
                            }
                        }
                        loop_index += 1;
                    };
                    assert!(
                        participated,
                        "Tournament: ScoreSubmitted tournament token id {} did not participate in any gated tournament",
                        token_id,
                    );
                },
            }
        }

        fn _assert_qualifying_address(
            self: @ComponentState<TContractState>,
            address: ContractAddress,
            qualifying_addresses: Span<ContractAddress>,
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
            assert!(
                found, "Tournament: Caller is not whitelisted for the address gated tournament",
            );
        }

        //
        // INTERNALS
        //

        // TODO: add for V2 (only ERC721 tokens)
        fn _register_token(
            ref self: ComponentState<TContractState>,
            token: ContractAddress,
            token_data: TokenDataType,
        ) -> (ByteArray, ByteArray) {
            let mut name = "";
            let mut symbol = "";

            match token_data {
                TokenDataType::erc20(_) => {
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
                TokenDataType::erc721(token_data_type) => {
                    let token_dispatcher = IERC721Dispatcher { contract_address: token };
                    let token_dispatcher_metadata = IERC721MetadataDispatcher {
                        contract_address: token,
                    };
                    name = token_dispatcher_metadata.name();
                    symbol = token_dispatcher_metadata.symbol();
                    // check that the contract is approved for the specific id
                    let approved = token_dispatcher.get_approved(token_data_type.token_id.into());
                    let token_address: felt252 = token.into();
                    assert!(
                        approved == get_contract_address(),
                        "Tournament: Token address {} has invalid approval",
                        token_address,
                    );
                    // transfer a specific id to the contract
                    token_dispatcher
                        .transfer_from(
                            get_caller_address(),
                            get_contract_address(),
                            token_data_type.token_id.into(),
                        );
                    // check the balance of the contract
                    let balance = token_dispatcher.balance_of(get_contract_address());
                    assert!(
                        balance == 1,
                        "Tournament: Token address {} has invalid balance",
                        token_address,
                    );
                    let owner = token_dispatcher.owner_of(token_data_type.token_id.into());
                    assert!(
                        owner == get_contract_address(),
                        "Tournament: Token address {} has invalid owner",
                        token_address,
                    );
                    // transfer back the token
                    token_dispatcher
                        .transfer_from(
                            get_contract_address(),
                            get_caller_address(),
                            token_data_type.token_id.into(),
                        );
                },
            }
            (name, symbol)
        }

        /// @dev Mint a new game token and distribute it to the owner of the tournament token.
        /// @param tournament The tournament model.
        /// @param tournament_token_id The tournament token id.
        /// @return The game token id.
        fn _mint_and_distribute_game(
            ref self: ComponentState<TContractState>,
            tournament: @TournamentModel,
            tournament_token_id: u64,
        ) -> u64 {
            // get the owner of the tournament token
            let owner = IERC721Dispatcher { contract_address: get_contract_address() }
                .owner_of(tournament_token_id.into());

            // mint a new game token to the owner
            let game_dispatcher = IGameDispatcher { contract_address: *tournament.game_address };
            let game_token_id = game_dispatcher.new_game(*tournament.settings_id, owner);

            // return the token id of the new game
            game_token_id
        }

        fn _pay_premiums(ref self: ComponentState<TContractState>, entry_premium: Option<Premium>) {
            match entry_premium {
                Option::Some(premium) => {
                    let erc20_dispatcher = IERC20Dispatcher {
                        contract_address: premium.token_address,
                    };
                    erc20_dispatcher
                        .transfer_from(
                            get_caller_address(),
                            get_contract_address(),
                            premium.token_amount.into(),
                        );
                },
                Option::None => {},
            };
        }

        fn _mint_tournament_token(
            ref self: ComponentState<TContractState>, ref store: Store,
        ) -> u64 {
            // get erc721 component
            let mut erc721 = get_dep_component_mut!(ref self, ERC721);

            // increment and get next token id
            let token_id = store.increment_and_get_token_supply();

            // mint tournament token
            erc721.mint(get_caller_address(), token_id.into());

            // return tournament token id
            token_id
        }

        /// @dev Convert the entry premium into prizes.
        /// @param tournament_id The tournament id. 
        fn _convert_premiums_into_prizes(
            ref self: ComponentState<TContractState>, ref store: Store, tournament_id: u64,
        ) {
            let mut tournament = store.get_tournament(tournament_id);
            let mut prize_metrics = store.get_prize_metrics(VERSION);

            match tournament.entry_premium {
                Option::Some(premium) => {
                    let total_entries = store.get_tournament_entry_count(tournament_id);
                    // first pay the creator fee
                    let erc20_dispatcher = IERC20Dispatcher {
                        contract_address: premium.token_address,
                    };
                    let creator_amount = self
                        ._calculate_payout(
                            premium.creator_fee.into(),
                            total_entries.count.into() * premium.token_amount,
                        );
                    if creator_amount > 0 {
                        erc20_dispatcher.transfer(tournament.creator, creator_amount.into());
                    }

                    // then format the rest of the premium distributions into prize keys
                    let players_amount = (total_entries.count.into() * premium.token_amount)
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

                        prize_metrics.total_prizes += 1;
                        let prize = Prize {
                            tournament_id,
                            prize_id: prize_metrics.total_prizes,
                            token: premium.token_address,
                            token_data_type: TokenDataType::erc20(
                                ERC20Data { token_amount: distribution_amount },
                            ),
                            payout_position: (distribution_index + 1).try_into().unwrap(),
                            claimed: false,
                        };
                        store.set_prize(@prize);
                        distribution_index += 1;
                    };

                    // update prize metrics to reflect the new total prizes
                    store.set_prize_metrics(@prize_metrics);
                },
                Option::None => {},
            }
        }

        fn _update_tournament_scores(
            ref self: ComponentState<TContractState>,
            store: Store,
            tournament_id: u64,
            tournament_token_id: u64,
            score: u64,
            game_index: u32,
        ) -> u64 {
            // get current scores which will be mutated as part of this function
            let top_score_token_ids = store
                .get_tournament_scores(tournament_id)
                .top_score_token_ids;

            let num_scores = top_score_token_ids.len();

            let mut new_score_id: u64 = 0;
            let mut new_score: u64 = 0;

            if num_scores == 0 {
                new_score_id = tournament_token_id.try_into().unwrap();
                new_score = score;
            } else {
                if (game_index < num_scores) {
                    let top_score_id = *top_score_token_ids.at(game_index);
                    let top_score = self
                        .get_score_for_token_id(
                            store, tournament_id, top_score_id.try_into().unwrap(),
                        );
                    if (score > top_score) {
                        new_score_id = tournament_token_id.try_into().unwrap();
                        new_score = score;
                    } else {
                        new_score_id = top_score_id;
                        new_score = top_score;
                    }
                } else {
                    new_score_id = tournament_token_id.try_into().unwrap();
                    new_score = score;
                }
            }

            new_score_id
        }

        fn _deposit_prize(
            ref self: ComponentState<TContractState>,
            tournament_id: u64,
            token: ContractAddress,
            token_data_type: TokenDataType,
            position: u8,
        ) {
            match token_data_type {
                TokenDataType::erc20(token_data) => {
                    let token_dispatcher = IERC20Dispatcher { contract_address: token };
                    assert!(
                        token_data.token_amount > 0,
                        "Tournament: ERC20 prize token amount must be greater than 0",
                    );
                    token_dispatcher
                        .transfer_from(
                            get_caller_address(),
                            get_contract_address(),
                            token_data.token_amount.into(),
                        );
                },
                TokenDataType::erc721(token_data) => {
                    let token_dispatcher = IERC721Dispatcher { contract_address: token };
                    self
                        ._assert_token_owner(
                            token, token_data.token_id.into(), get_caller_address(),
                        );
                    token_dispatcher
                        .transfer_from(
                            get_caller_address(),
                            get_contract_address(),
                            token_data.token_id.into(),
                        );
                },
            }
        }

        fn _distribute_prize_to_creator(
            ref self: ComponentState<TContractState>, prize: Prize, creator: ContractAddress,
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
            ref self: ComponentState<TContractState>, prize: Prize, address: ContractAddress,
        ) {
            match prize.token_data_type {
                TokenDataType::erc20(token_data) => {
                    let token_dispatcher = IERC20Dispatcher { contract_address: prize.token };
                    assert!(
                        token_data.token_amount > 0,
                        "Tournament: ERC20 prize token amount must be greater than 0",
                    );
                    token_dispatcher.transfer(address, token_data.token_amount.into());
                },
                TokenDataType::erc721(token_data) => {
                    let token_dispatcher = IERC721Dispatcher { contract_address: prize.token };
                    token_dispatcher
                        .transfer_from(get_contract_address(), address, token_data.token_id.into());
                },
            }
        }

        fn _calculate_payout(
            ref self: ComponentState<TContractState>, bp: u128, total_value: u128,
        ) -> u128 {
            (bp * total_value) / 100
        }
    }
}
