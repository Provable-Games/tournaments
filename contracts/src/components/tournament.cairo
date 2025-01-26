use starknet::ContractAddress;
use tournaments::components::models::tournament::{
    Tournament as TournamentModel, EntryRequirement, EntryFee, TokenDataType, Registration,
    PrizeType,
};

///
/// Interface
///

#[starknet::interface]
trait ITournament<TState> {
    fn create_tournament(
        ref self: TState,
        name: felt252,
        description: ByteArray,
        registration_start_time: u64,
        registration_end_time: u64,
        start_time: u64,
        end_time: u64,
        submission_period: u64,
        prize_spots: u8,
        entry_requirement: Option<EntryRequirement>,
        entry_fee: Option<EntryFee>,
        game_address: ContractAddress,
        settings_id: u32,
    ) -> (u64, u64);
    fn enter_tournament(
        ref self: TState,
        tournament_id: u64,
        name: felt252,
        player_address: ContractAddress,
        qualifying_token_id: Option<u256>,
    ) -> (u64, u32);
    fn submit_scores(ref self: TState, tournament_id: u64, token_ids: Array<u64>);
    fn claim_prize(ref self: TState, tournament_id: u64, prize_type: PrizeType);
    fn add_prize(
        ref self: TState,
        tournament_id: u64,
        token_address: ContractAddress,
        token_data_type: TokenDataType,
        position: u8,
    ) -> u64;
    fn total_tournaments(self: @TState) -> u64;
    fn tournament(self: @TState, tournament_id: u64) -> TournamentModel;
    fn get_registration(self: @TState, token_id: u64) -> Registration;
    fn tournament_entries(self: @TState, tournament_id: u64) -> u32;
    fn is_token_registered(self: @TState, address: ContractAddress) -> bool;
    fn register_token(ref self: TState, address: ContractAddress, token_data: TokenDataType);
    fn tournament_winners(self: @TState, tournament_id: u64) -> Span<u64>;
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
        Tournament as TournamentModel, Registration, TournamentState, TournamentScores, Prize,
        Token, TournamentConfig, TokenDataType, EntryRequirement, TournamentType, EntryFee,
        ERC20Data, ERC721Data, PrizeType, Role, PrizeClaim,
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
        fn get_registration(self: @ComponentState<TContractState>, token_id: u64) -> Registration {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            store.get_registration(token_id)
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

        fn tournament_winners(
            self: @ComponentState<TContractState>, tournament_id: u64,
        ) -> Span<u64> {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            store.get_tournament_scores(tournament_id).winner_token_ids
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
        /// @param prize_spots A u8 representing the number of winners.
        /// @param entry_requirement A Option<EntryRequirement> representing the gated type of the
        /// tournament.
        /// @param entry_fee A Option<EntryFee> representing the entry entry_fee of the tournament.
        /// @param game A ContractAddress representing the game to be played in the tournament.
        /// @param settings_id A u32 representing the settings id to be used for the tournament.
        /// @return A tuple containing the tournament id and the game token id.
        fn create_tournament(
            ref self: ComponentState<TContractState>,
            name: felt252,
            description: ByteArray,
            registration_start_time: u64,
            registration_end_time: u64,
            start_time: u64,
            end_time: u64,
            submission_period: u64,
            prize_spots: u8,
            entry_requirement: Option<EntryRequirement>,
            entry_fee: Option<EntryFee>,
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
            self._assert_winners_count_greater_than_zero(prize_spots);
            self._assert_gated_type_validates(store, entry_requirement);

            if let Option::Some(config) = entry_fee {
                self._assert_entry_fee_token_registered(@store.get_token(config.token_address));
                self
                    ._assert_valid_payout_distribution(
                        config.distribution, config.creator_fee, prize_spots,
                    );
            }

            let src5_dispatcher = ISRC5Dispatcher { contract_address: game_address };
            self._assert_game_supports_game_interface(src5_dispatcher, game_address);
            self._assert_game_supports_game_metadata_interface(src5_dispatcher, game_address);
            self._assert_game_supports_erc721_interface(src5_dispatcher, game_address);

            self._assert_settings_exists(game_address, settings_id);

            // increment and get the next tournament id
            let tournament_id = store.increment_and_get_tournament_count();

            // create tournament
            let tournament = TournamentModel {
                id: tournament_id,
                name,
                description,
                creator: get_caller_address(),
                registration_start_time,
                registration_end_time,
                start_time,
                end_time,
                submission_period,
                prize_spots,
                entry_requirement,
                entry_fee,
                game_address,
                settings_id,
                state: TournamentState::Registration,
            };

            // save it
            store.set_tournament(@tournament);

            // mint a game token to the creator as entry #0 to provide simply way to issue creator
            // rewards
            let game_token_id = self
                ._mint_and_distribute_game(@tournament, name, get_caller_address());

            // save token metadata
            let registration = Registration {
                game_token_id, tournament_id, entry_number: 0, submitted_score: false,
            };
            store.set_registration(@registration);

            // return tournament id and game token id of the creator
            (tournament_id, game_token_id)
        }

        /// @title Enter tournament
        /// @notice Allows a player to enter a tournament for a particular tournament id.
        /// @dev Requires a tournament to have already been created.
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        /// @param name A felt252 representing the name of the tournament.
        /// @param player_address A ContractAddress which the game token will be minted to.
        /// @param qualifying_token_id A Option<u256> representing the token id
        /// @return A tuple containing the tournament token id and the entry number.
        fn enter_tournament(
            ref self: ComponentState<TContractState>,
            tournament_id: u64,
            name: felt252,
            player_address: ContractAddress,
            qualifying_token_id: Option<u256>,
        ) -> (u64, u32) {
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
                    store, tournament.entry_requirement, qualifying_token_id,
                );

            // handle entry fee
            self._process_entry_fee(tournament.entry_fee);

            // mint game and send to player
            let game_token_id = self._mint_and_distribute_game(@tournament, name, player_address);

            // increment and get entry count for the tournament
            let entry_number = store.increment_and_get_tournament_entry_count(tournament_id);

            // attach metadata to the tournament token and save it
            let registration = Registration {
                game_token_id, tournament_id, entry_number, submitted_score: false,
            };
            store.set_registration(@registration);

            // return tournament token id and entry number
            (game_token_id, entry_number)
        }

        /// @title Submit scores
        /// @notice Allows anyone to submit scores for a tournament for a particular tournament id.
        /// @dev For more efficient gas we assume that the game ids are in order of highest score
        /// @param self A reference to the ContractState object.
        /// @param tournament_id A u64 representing the unique ID of the tournament.
        /// @param token_ids An array of u64 representing the token ids to submit.
        /// TODO: Change this to accept a single token id with the expected position in the top
        /// scores
        /// TODO: Provide a view function for `get_placement_for_token_id` that returns the
        /// position of the token id in the top scores.
        /// TODO: Prevent entry 0 (creator) from submitting a score
        fn submit_scores(
            ref self: ComponentState<TContractState>, tournament_id: u64, token_ids: Array<u64>,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);

            self._assert_tournament_ended(tournament.end_time, tournament_id);
            self._assert_scores_count_valid(@tournament, token_ids.len());
            self._assert_tournament_not_settled(@tournament);

            let mut game_dispatcher = IGameDispatcher { contract_address: tournament.game_address };

            // loop through game ids and update scores
            let mut num_games = token_ids.len();
            let mut token_index = 0;
            let mut winner_token_ids = ArrayTrait::<u64>::new();
            loop {
                if token_index == num_games {
                    break;
                }
                let token_id = *token_ids.at(token_index);

                // get token metadata from game contract
                let token_metadata = game_dispatcher.token_metadata(token_id);

                // assert game has ended
                self._assert_game_ended(token_id, token_metadata.expires_at);

                // get score from game contract
                let score = game_dispatcher.get_score(token_id);

                winner_token_ids
                    .append(
                        self
                            ._update_tournament_scores(
                                store, tournament_id, token_id, score, token_index,
                            ),
                    );

                // increment token index
                token_index += 1;
            };

            store
                .set_tournament_scores(
                    @TournamentScores { tournament_id, winner_token_ids: winner_token_ids.span() },
                );
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

            self._assert_tournament_settled(@tournament);
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
        /// @param token_data_type A TokenDataType representing the type of token to add as a prize.
        /// @param position A u8 representing the scoreboard position to distribute the prize to.
        /// @return A u64 representing the unique ID of the prize.
        fn add_prize(
            ref self: ComponentState<TContractState>,
            tournament_id: u64,
            token_address: ContractAddress,
            token_data_type: TokenDataType,
            position: u8,
        ) -> u64 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            let mut tournament = store.get_tournament(tournament_id);

            self._assert_tournament_not_ended(tournament.end_time, tournament_id);
            self._assert_prize_token_registered(@store.get_token(token_address));
            self._assert_prize_position_less_than_winners_count(@tournament, position);

            self._deposit_prize(tournament_id, token_address, token_data_type, position);

            // get next prize id (updates prize count)
            let id = store.increment_and_get_prize_count();

            // create and save new prize
            store
                .set_prize(
                    @Prize {
                        id,
                        tournament_id,
                        token_address,
                        token_data_type,
                        payout_position: position,
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
            self: @ComponentState<TContractState>,
            contract_address: ContractAddress,
            token_id: u256,
        ) -> ContractAddress {
            IERC721Dispatcher { contract_address }.owner_of(token_id)
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

        // @dev instead of iterating over all scores, we just check if the submitted score is
        // greater than the last place score this works as long as we know the score was submitted
        // before the tournament ended
        fn _is_top_score(
            self: @ComponentState<TContractState>, store: Store, tournament_id: u64, score: u64,
        ) -> bool {
            let winner_token_ids = store.get_tournament_scores(tournament_id).winner_token_ids;
            let num_scores = winner_token_ids.len();

            if num_scores == 0 {
                return true;
            }

            let last_place_id = *winner_token_ids.at(num_scores - 1);
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
            self: @ComponentState<TContractState>, prize_spots: u8,
        ) {
            assert!(prize_spots > 0, "Tournament: Winners count must be greater than zero");
        }

        fn _assert_valid_payout_distribution(
            self: @ComponentState<TContractState>,
            prize_distribution: Span<u8>,
            creator_percentage: u8,
            prize_spots: u8,
        ) {
            // verify distribution length matches prize spots
            self
                ._assert_entry_fee_token_distribution_length_not_too_long(
                    prize_distribution.len(), prize_spots.into(),
                );

            // check the sum of distributions is equal to 100%
            let mut player_percentage: u8 = 0;
            let mut distribution_index: u32 = 0;
            loop {
                if distribution_index == prize_distribution.len() {
                    break;
                }
                let distribution = *prize_distribution.at(distribution_index);
                player_percentage += distribution;
                distribution_index += 1;
            };
            self
                ._assert_entry_fee_token_distribution_sum_is_100(
                    player_percentage, creator_percentage,
                );
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
            tournament_creator_percentage: u8,
        ) {
            assert!(
                player_percentage + tournament_creator_percentage == 100,
                "Tournament: Entry fee distribution is not 100%. Player percentage: {}%, Tournament creator percentage: {}%",
                player_percentage,
                tournament_creator_percentage,
            );
        }

        fn _assert_prize_token_registered(self: @ComponentState<TContractState>, token: @Token) {
            assert!(self._is_token_registered(token), "Tournament: Prize token is not registered");
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

        fn _assert_tournament_active(
            self: @ComponentState<TContractState>, tournament: @TournamentModel,
        ) {
            let is_active = self._is_tournament_active(tournament);
            assert!(is_active, "Tournament: Tournament id {} is not active", tournament.id);
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

        fn _assert_tournament_not_finalized(
            self: @ComponentState<TContractState>, state: TournamentState, tournament_id: u64,
        ) {
            assert!(
                state != TournamentState::Finalized,
                "Tournament: Tournament id {} is already finalized",
                tournament_id,
            );
        }

        fn _assert_scores_count_valid(
            self: @ComponentState<TContractState>, tournament: @TournamentModel, scores_count: u32,
        ) {
            let prize_spots = *tournament.prize_spots;
            assert!(
                scores_count <= prize_spots.into(),
                "Tournament: The length of scores submissions {} is greater than the winners count {}",
                scores_count,
                prize_spots,
            );
        }

        fn _assert_prize_position_less_than_winners_count(
            self: @ComponentState<TContractState>, tournament: @TournamentModel, position: u8,
        ) {
            assert!(
                position <= *tournament.prize_spots,
                "Tournament: Prize position {} is greater than the winners count {}",
                position,
                *tournament.prize_spots,
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
            entry_requirement: Option<EntryRequirement>,
        ) {
            match entry_requirement {
                Option::Some(entry_requirement) => {
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
                        EntryRequirement::address(_) => {},
                    }
                },
                Option::None => {},
            }
        }

        fn _assert_tournament_settled(
            self: @ComponentState<TContractState>, tournament: @TournamentModel,
        ) {
            assert!(
                get_block_timestamp() >= *tournament.end_time + *tournament.submission_period,
                "Tournament: Tournament id {} is not settled",
                tournament.id,
            );
        }

        fn _assert_tournament_not_settled(
            self: @ComponentState<TContractState>, tournament: @TournamentModel,
        ) {
            assert!(
                *tournament.end_time + *tournament.submission_period > get_block_timestamp(),
                "Tournament: Tournament id {} is already settled",
                tournament.id,
            );
        }

        fn _assert_token_satisfies_gate(
            self: @ComponentState<TContractState>,
            store: Store,
            entry_requirement: Option<EntryRequirement>,
            qualifying_token_id: Option<u256>,
        ) {
            match entry_requirement {
                Option::Some(entry_requirement) => {
                    match entry_requirement {
                        // NFT ownership gate
                        EntryRequirement::token(token_address) => {
                            match qualifying_token_id {
                                Option::Some(token_id) => {
                                    self._assert_gated_token_owner(token_address, token_id);
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
                        EntryRequirement::tournament(tournament_type) => {
                            match qualifying_token_id {
                                Option::Some(token_id) => {
                                    self
                                        ._assert_has_qualified_in_tournaments(
                                            store, tournament_type, token_id.try_into().unwrap(),
                                        );
                                },
                                Option::None => {
                                    assert!(false, "Tournament: No qualifying token id supplied");
                                },
                            }
                        },
                        EntryRequirement::address(qualifying_addresses) => {
                            self._assert_qualifying_address(qualifying_addresses);
                        },
                    }
                },
                Option::None => {},
            };
        }

        // TODO: Instead of looping through all qualifying tournaments, the caller should pass in
        // the tournament ID they are qualifying with.
        // This will simplify this code to an assertion that the tournament ID is part of the set
        // ofqualifying tournament IDs and an assertion that the caller owns the qualifying token
        // id.
        // TODO: Need to prevent the same game token from being used to qualify into the same
        // tournament
        fn _assert_has_qualified_in_tournaments(
            self: @ComponentState<TContractState>,
            store: Store,
            tournament_type: TournamentType,
            token_id: u64,
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

                        let owner = self._get_owner(tournament.game_address, token_id.into());
                        if owner == get_caller_address() {
                            // assert the provided token was registered for the tournament
                            let registration = store.get_registration(token_id);
                            if registration.tournament_id == tournament.id {
                                let score = game_dispatcher.get_score(token_id);
                                self._is_top_score(store, *tournament_ids.at(loop_index), score);
                                qualified = true;
                            }
                        }

                        loop_index += 1;
                    };
                    assert!(
                        qualified,
                        "Tournament: game token id {} is not a top score in a qualifying tournament",
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

                        // if the caller owners the provided game token
                        if owner == get_caller_address() {
                            participated = true;
                            break;
                        }
                        loop_index += 1;
                    };
                    assert!(
                        participated,
                        "Tournament: game token id {} did not participate in a qualifying tournament",
                        token_id,
                    );
                },
            }
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
        /// @param name The name of the player to mint the game token to.
        /// @param player_address The address of the player to mint the game token to.
        /// @return The game token id.
        fn _mint_and_distribute_game(
            ref self: ComponentState<TContractState>,
            tournament: @TournamentModel,
            player_name: felt252,
            player_address: ContractAddress,
        ) -> u64 {
            let game_dispatcher = IGameDispatcher { contract_address: *tournament.game_address };
            let game_token_id = game_dispatcher
                .new_game(
                    player_name,
                    *tournament.settings_id,
                    *tournament.start_time,
                    *tournament.end_time,
                    player_address,
                );
            game_token_id
        }

        fn _process_entry_fee(
            ref self: ComponentState<TContractState>, entry_fee: Option<EntryFee>,
        ) {
            match entry_fee {
                Option::Some(entry_fee) => {
                    let erc20_dispatcher = IERC20Dispatcher {
                        contract_address: entry_fee.token_address,
                    };
                    erc20_dispatcher
                        .transfer_from(
                            get_caller_address(), get_contract_address(), entry_fee.amount.into(),
                        );
                },
                Option::None => {},
            };
        }

        fn _update_tournament_scores(
            ref self: ComponentState<TContractState>,
            store: Store,
            tournament_id: u64,
            game_token_id: u64,
            score: u64,
            game_index: u32,
        ) -> u64 {
            // get current scores which will be mutated as part of this function
            let winner_token_ids = store.get_tournament_scores(tournament_id).winner_token_ids;

            let num_scores = winner_token_ids.len();

            let mut new_score_id: u64 = 0;
            let mut new_score: u64 = 0;

            if num_scores == 0 {
                new_score_id = game_token_id.try_into().unwrap();
                new_score = score;
            } else {
                if (game_index < num_scores) {
                    let top_score_id = *winner_token_ids.at(game_index);
                    let top_score = self
                        .get_score_for_token_id(
                            store, tournament_id, top_score_id.try_into().unwrap(),
                        );
                    if (score > top_score) {
                        new_score_id = game_token_id.try_into().unwrap();
                        new_score = score;
                    } else {
                        new_score_id = top_score_id;
                        new_score = top_score;
                    }
                } else {
                    new_score_id = game_token_id.try_into().unwrap();
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
            match tournament.entry_fee {
                Option::Some(config) => {
                    let total_entries = store.get_tournament_entry_count(tournament_id).count;
                    let total_pool = total_entries.into() * config.amount;

                    // Calculate share based on recipient type
                    let share = match role {
                        Role::TournamentCreator => { config.creator_fee },
                        Role::GameCreator => {
                            // TODO: issue #2
                            panic!("Tournament: Game creator fee not yet implemented")
                        },
                        Role::Position(position) => {
                            let winners = store
                                .get_tournament_scores(tournament_id)
                                .winner_token_ids;
                            self._assert_position_is_valid(position, winners.len());
                            *config.distribution.at(position.into() - 1)
                        },
                    };

                    let prize_amount = self._calculate_payout(share.into(), total_pool);

                    // Get recipient address
                    let recipient_address = match role {
                        Role::TournamentCreator => { tournament.creator },
                        Role::GameCreator => {
                            self._get_game_creator_address(tournament.game_address)
                        },
                        Role::Position(position) => {
                            let winners = store
                                .get_tournament_scores(tournament_id)
                                .winner_token_ids;
                            let winner_token_id = *winners.at(position.into() - 1);
                            self._get_owner(tournament.game_address, winner_token_id.into())
                        },
                    };

                    if prize_amount > 0 {
                        let erc20_dispatcher = IERC20Dispatcher {
                            contract_address: config.token_address,
                        };
                        erc20_dispatcher.transfer(recipient_address, prize_amount.into());
                    }
                },
                Option::None => {
                    panic!("Tournament: tournament {} has no entry fees", tournament_id);
                },
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
            let winner_token_ids = store.get_tournament_scores(tournament_id).winner_token_ids;
            self._assert_position_is_valid(prize.payout_position, winner_token_ids.len());

            let winner_token_id = *winner_token_ids.at(prize.payout_position.into() - 1);
            let winner_address = self._get_owner(tournament.game_address, winner_token_id.into());

            // Transfer prize
            match prize.token_data_type {
                TokenDataType::erc20(data) => {
                    let erc20 = IERC20Dispatcher { contract_address: prize.token_address };
                    erc20.transfer(winner_address, data.token_amount.into());
                },
                TokenDataType::erc721(data) => {
                    let erc721 = IERC721Dispatcher { contract_address: prize.token_address };
                    erc721
                        .transfer_from(
                            get_contract_address(), winner_address, data.token_id.into(),
                        );
                },
            };
        }
    }
}
