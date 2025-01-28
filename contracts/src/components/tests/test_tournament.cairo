// SPDX-License-Identifier: UNLICENSED

use core::option::Option;
use starknet::{ContractAddress, get_block_timestamp, testing};
use dojo::world::{WorldStorage};
use dojo_cairo_test::{
    spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef,
    WorldStorageTestTrait,
};

use tournaments::components::constants::{
    MIN_REGISTRATION_PERIOD, MIN_SUBMISSION_PERIOD, MAX_SUBMISSION_PERIOD, MIN_TOURNAMENT_LENGTH,
    DEFAULT_NS,
};

use tournaments::components::tests::interfaces::WorldTrait;

use tournaments::components::models::{
    game::{m_GameMetadata, m_GameCount, m_SettingsDetails, m_TokenMetadata, m_Score},
    tournament::{
        m_Tournament, m_Registration, m_EntryCount, m_Leaderboard, m_Prize, m_Token,
        m_TournamentConfig, m_PrizeMetrics, m_PlatformMetrics, m_TournamentTokenMetrics,
        m_PrizeClaim, ERC20Data, ERC721Data, EntryFee, TokenType, EntryRequirement, TournamentType,
        PrizeType, Role, TournamentState, Schedule, Period, EntryConfig,
    },
};

use tournaments::tests::{
    utils,
    constants::{
        OWNER, TOURNAMENT_NAME, TOURNAMENT_DESCRIPTION, STARTING_BALANCE,
        TEST_REGISTRATION_START_TIME, TEST_REGISTRATION_END_TIME, TEST_START_TIME, TEST_END_TIME,
    },
};
use tournaments::components::tests::helpers::{
    create_basic_tournament, create_settings_details, test_metadata, test_game_config,
    test_schedule, custom_schedule, test_game_period, registration_period_too_short,
    registration_period_too_long, registration_open_beyond_tournament_end, test_season_schedule,
    tournament_too_long,
};
use tournaments::components::tests::mocks::{
    erc20_mock::erc20_mock, erc721_mock::erc721_mock, tournament_mock::tournament_mock,
    game_mock::game_mock,
};
use tournaments::components::tests::interfaces::{
    IGameMockDispatcher, IGameMockDispatcherTrait, ITournamentMockDispatcher,
    ITournamentMockDispatcherTrait, IERC20MockDispatcher, IERC20MockDispatcherTrait,
    IERC721MockDispatcher, IERC721MockDispatcherTrait, IGAME_ID, IGAME_METADATA_ID,
};

use openzeppelin_token::erc721::interface;
use openzeppelin_token::erc721::{ERC721Component::{Transfer, Approval}};

#[derive(Drop)]
pub struct TestContracts {
    pub world: WorldStorage,
    pub tournament: ITournamentMockDispatcher,
    pub game: IGameMockDispatcher,
    pub erc20: IERC20MockDispatcher,
    pub erc721: IERC721MockDispatcher,
}


//
// events helpers
//

fn assert_event_transfer(
    emitter: ContractAddress, from: ContractAddress, to: ContractAddress, token_id: u256,
) {
    let event = utils::pop_log::<Transfer>(emitter).unwrap();
    assert(event.from == from, 'Invalid `from`');
    assert(event.to == to, 'Invalid `to`');
    assert(event.token_id == token_id, 'Invalid `token_id`');
}

fn assert_only_event_transfer(
    emitter: ContractAddress, from: ContractAddress, to: ContractAddress, token_id: u256,
) {
    assert_event_transfer(emitter, from, to, token_id);
    utils::assert_no_events_left(emitter);
}

fn assert_event_approval(
    emitter: ContractAddress, owner: ContractAddress, approved: ContractAddress, token_id: u256,
) {
    let event = utils::pop_log::<Approval>(emitter).unwrap();
    assert(event.owner == owner, 'Invalid `owner`');
    assert(event.approved == approved, 'Invalid `approved`');
    assert(event.token_id == token_id, 'Invalid `token_id`');
}

fn assert_only_event_approval(
    emitter: ContractAddress, owner: ContractAddress, approved: ContractAddress, token_id: u256,
) {
    assert_event_approval(emitter, owner, approved, token_id);
    utils::assert_no_events_left(emitter);
}


//
// Setup
//

fn setup_uninitialized() -> WorldStorage {
    testing::set_block_number(1);
    testing::set_block_timestamp(1);

    let ndef = NamespaceDef {
        namespace: "tournaments",
        resources: [
            // game models
            TestResource::Model(m_GameMetadata::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_GameCount::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_SettingsDetails::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TokenMetadata::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_Score::TEST_CLASS_HASH.try_into().unwrap()),
            // tournament models
            TestResource::Model(m_Tournament::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_Registration::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_EntryCount::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_Leaderboard::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_Prize::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_Token::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TournamentConfig::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_PrizeMetrics::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_PlatformMetrics::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TournamentTokenMetrics::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_PrizeClaim::TEST_CLASS_HASH.try_into().unwrap()),
            // contracts
            TestResource::Contract(tournament_mock::TEST_CLASS_HASH),
            TestResource::Contract(game_mock::TEST_CLASS_HASH),
            TestResource::Contract(erc20_mock::TEST_CLASS_HASH),
            TestResource::Contract(erc721_mock::TEST_CLASS_HASH),
        ]
            .span(),
    };

    let mut contract_defs: Array<ContractDef> = array![
        ContractDefTrait::new(DEFAULT_NS(), @"tournament_mock")
            .with_writer_of([dojo::utils::bytearray_hash(DEFAULT_NS())].span()),
        ContractDefTrait::new(DEFAULT_NS(), @"game_mock")
            .with_writer_of([dojo::utils::bytearray_hash(DEFAULT_NS())].span()),
        ContractDefTrait::new(DEFAULT_NS(), @"erc20_mock")
            .with_writer_of([dojo::utils::bytearray_hash(DEFAULT_NS())].span()),
        ContractDefTrait::new(DEFAULT_NS(), @"erc721_mock")
            .with_writer_of([dojo::utils::bytearray_hash(DEFAULT_NS())].span()),
    ];

    let mut world: WorldStorage = spawn_test_world([ndef].span());

    world.sync_perms_and_inits(contract_defs.span());

    world
}

pub fn setup() -> TestContracts {
    let mut world = setup_uninitialized();

    let tournament = world.tournament_mock_dispatcher();
    let game = world.game_mock_dispatcher();
    let erc20 = world.erc20_mock_dispatcher();
    let erc721 = world.erc721_mock_dispatcher();

    // initialize contracts
    tournament
        .initializer(
            "Tournament",
            "TOURNAMENT",
            "https://tournament.com",
            false,
            false,
            erc20.contract_address,
            erc721.contract_address,
        );
    game.initializer();

    // mint tokens
    utils::impersonate(OWNER());
    erc20.mint(OWNER(), STARTING_BALANCE);
    erc721.mint(OWNER(), 1);

    // drop all events
    utils::drop_all_events(world.dispatcher.contract_address);
    utils::drop_all_events(tournament.contract_address);
    utils::drop_all_events(game.contract_address);

    create_settings_details(game);

    TestContracts { world, tournament, game, erc20, erc721 }
}

//
// Test initializers
//

#[test]
fn test_initializer() {
    let contracts = setup();

    assert(contracts.game.symbol() == "GAME", 'Symbol is wrong');

    assert(
        contracts.game.supports_interface(interface::IERC721_ID) == true,
        'should support IERC721_ID',
    );
    assert(
        contracts.game.supports_interface(interface::IERC721_METADATA_ID) == true,
        'should support TOKEN_METADATA',
    );
    assert(contracts.game.supports_interface(IGAME_ID) == true, 'should support GAME');
    assert(
        contracts.game.supports_interface(IGAME_METADATA_ID) == true,
        'should support GAME_METADATA',
    );

    assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE, 'Invalid balance');
    assert(contracts.erc721.balance_of(OWNER()) == 1, 'Invalid balance');
}

//
// Test creating tournaments
//

#[test]
fn test_create_tournament() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let (tournament, creator_game_token_id) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    assert(tournament.metadata.name == TOURNAMENT_NAME(), 'Invalid tournament name');
    assert(
        tournament.metadata.description == TOURNAMENT_DESCRIPTION(),
        'Invalid tournament description',
    );
    match tournament.schedule.registration {
        Option::Some(registration) => {
            assert(
                registration.start == TEST_REGISTRATION_START_TIME().into(),
                'Invalid registration start',
            );
            assert(
                registration.end == TEST_REGISTRATION_END_TIME().into(), 'Invalid registration end',
            );
        },
        Option::None => { panic!("Tournament should have registration"); },
    }

    assert(
        tournament.schedule.game.start == TEST_START_TIME().into(), 'Invalid tournament start time',
    );
    assert(tournament.schedule.game.end == TEST_END_TIME().into(), 'Invalid tournament end time');
    assert!(tournament.entry_config == Option::None, "tournament entry config should be none");
    assert(
        tournament.game_config.address == contracts.game.contract_address, 'Invalid game address',
    );
    assert(tournament.game_config.settings_id == 1, 'Invalid settings id');
    assert(contracts.tournament.total_tournaments() == 1, 'Invalid tournaments count');

    // assert ownership of creator game token
    let owner = contracts.game.owner_of(creator_game_token_id.into());
    assert(owner == OWNER(), 'Invalid owner');

    // get registration
    let registration = contracts.tournament.get_registration(tournament.id, creator_game_token_id);
    assert(registration.tournament_id == tournament.id, 'Invalid tournament id');
    assert(registration.entry_number == 0, 'Invalid entry number');
    assert(registration.has_submitted == false, 'Invalid submitted score');
    assert(registration.game_token_id == creator_game_token_id, 'Invalid game token id');
}

#[test]
#[should_panic(expected: ("Tournament: Start time 0 is not in the future.", 'ENTRYPOINT_FAILED'))]
fn test_create_tournament_start_time_too_close() {
    let contracts = setup();

    let current_time = get_block_timestamp();

    // try to create a tournament with the tournament start time in the past
    let game_period = Period {
        start: current_time.into() - 1, end: current_time.into() + MIN_TOURNAMENT_LENGTH.into(),
    };

    let schedule = custom_schedule(Option::None, game_period, MIN_SUBMISSION_PERIOD.into());

    contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::None,
        );
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Registration period of 899 lower than minimum 900", 'ENTRYPOINT_FAILED',
    ),
)]
fn test_create_tournament_registration_period_too_short() {
    let contracts = setup();

    let schedule = custom_schedule(
        Option::Some(registration_period_too_short()),
        test_game_period(),
        MIN_SUBMISSION_PERIOD.into(),
    );

    let entry_config = Option::None;

    contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            entry_config,
        );
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Registration period of 2592001 higher than maximum 2592000",
        'ENTRYPOINT_FAILED',
    ),
)]
fn test_create_tournament_registration_period_too_long() {
    let contracts = setup();

    let schedule = custom_schedule(
        Option::Some(registration_period_too_long()),
        test_game_period(),
        MIN_SUBMISSION_PERIOD.into(),
    );
    let entry_config = Option::None;
    contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            entry_config,
        );
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Registration end time 1802 after tournament end time 1801",
        'ENTRYPOINT_FAILED',
    ),
)]
fn test_create_tournament_end_time_too_close() {
    let contracts = setup();

    let schedule = registration_open_beyond_tournament_end();

    let entry_config = Option::None;

    contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            entry_config,
        );
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Tournament period of 31104001 higher than maximum 31104000",
        'ENTRYPOINT_FAILED',
    ),
)]
fn test_create_tournament_tournament_too_long() {
    let contracts = setup();

    let schedule = tournament_too_long();

    contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::None,
        );
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Submission period of 899 lower than the minimum 900", 'ENTRYPOINT_FAILED',
    ),
)]
fn test_create_tournament_submission_period_too_short() {
    let contracts = setup();

    let schedule = custom_schedule(
        Option::None, test_game_period(), MIN_SUBMISSION_PERIOD.into() - 1,
    );

    contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::None,
        );
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Submission period of 604801 higher than the maximum 604800",
        'ENTRYPOINT_FAILED',
    ),
)]
fn test_create_tournament_submission_period_too_long() {
    let contracts = setup();

    let schedule = custom_schedule(
        Option::None, test_game_period(), MAX_SUBMISSION_PERIOD.into() + 1,
    );

    contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::None,
        );
}

#[test]
fn test_create_tournament_with_prizes() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let (tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );
    contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.tournament.contract_address, 1);
    contracts
        .tournament
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenType::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            1,
        );
    contracts
        .tournament
        .add_prize(
            tournament.id,
            contracts.erc721.contract_address,
            TokenType::erc721(ERC721Data { id: 1 }),
            1,
        );
    assert(contracts.erc20.balance_of(OWNER()) == 0, 'Invalid balance');
    assert(contracts.erc721.balance_of(OWNER()) == 0, 'Invalid balance');
}

// #[test]
// #[should_panic(expected: ('prize token not registered', 'ENTRYPOINT_FAILED'))]
// fn test_create_tournament_with_prizes_token_not_registered() {
//     let (_world, mut tournament, _loot_survivor, _pragma, _eth, _lords, mut erc20, mut erc721,
// _golden_token, _blobert) =
//         setup();

//     utils::impersonate(OWNER());
//     create_basic_tournament(tournament);
//     erc20.approve(tournament.contract_address, 1);
//     erc721.approve(tournament.contract_address, 1);

//     erc20.approve(tournament.contract_address, STARTING_BALANCE);
//     erc721.approve(tournament.contract_address, 1);
//     tournament
//         .add_prize(
//             1,
//             erc20.contract_address,
//             TokenType::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
//             1
//         );
//     tournament
//         .add_prize(
//             1, erc721.contract_address, TokenType::erc721(ERC721Data { id: 1 }), 1
//         );
// }

#[test]
#[should_panic(
    expected: (
        "Tournament: Prize position 2 is greater than the winners count 1", 'ENTRYPOINT_FAILED',
    ),
)]
fn test_create_tournament_with_prizes_position_too_large() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let (tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.tournament.contract_address, 1);
    contracts
        .tournament
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenType::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            2,
        );
    contracts
        .tournament
        .add_prize(
            tournament.id,
            contracts.erc721.contract_address,
            TokenType::erc721(ERC721Data { id: 1 }),
            2,
        );
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Entry fee distribution length 2 is longer than prize spots 1",
        'ENTRYPOINT_FAILED',
    ),
)]
fn test_create_tournament_with_premiums_too_long() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // entry fee configuration attempts to distribute 90% to first place and 10% to second place
    // this isn't valid because the tournament will only be tracking a single top score
    let entry_fee = EntryFee {
        token_address: contracts.erc20.contract_address,
        amount: 1,
        distribution: array![90, 10].span(),
        tournament_creator_share: Option::None,
        game_creator_share: Option::None,
    };

    let entry_config = EntryConfig { fee: Option::Some(entry_fee), requirement: Option::None };

    contracts
        .tournament
        .create_tournament(
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Entry fee distribution needs to be 100%. Distribution: 95%",
        'ENTRYPOINT_FAILED',
    ),
)]
fn test_create_tournament_with_premiums_not_100() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let entry_fee = EntryFee {
        token_address: contracts.erc20.contract_address,
        amount: 1,
        distribution: array![90, 5].span(),
        tournament_creator_share: Option::None,
        game_creator_share: Option::None,
    };

    let entry_config = EntryConfig { fee: Option::Some(entry_fee), requirement: Option::None };

    let mut game_config = test_game_config(contracts.game.contract_address);
    game_config.prize_spots = 2;

    contracts
        .tournament
        .create_tournament(
            test_metadata(), test_schedule(), game_config, Option::Some(entry_config),
        );
}

#[test]
#[should_panic(expected: ("Tournament: Tournament 1 is not finalized", 'ENTRYPOINT_FAILED'))]
fn test_create_gated_tournament_with_unsettled_tournament() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create first tournament
    let (first_tournament, tournament_token_id) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    // Move to tournament start time
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter first tournament
    contracts
        .tournament
        .enter_tournament(first_tournament.id, 'test_player', OWNER(), Option::None);

    let entry_requirement = EntryRequirement::tournament(
        TournamentType::winners(array![tournament_token_id].span()),
    );

    let entry_config = EntryConfig {
        fee: Option::None, requirement: Option::Some(entry_requirement),
    };

    let current_time = get_block_timestamp();

    let registration_period = Period {
        start: current_time, end: current_time + MIN_REGISTRATION_PERIOD.into(),
    };

    let game_period = Period {
        start: current_time + MIN_REGISTRATION_PERIOD.into(),
        end: current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
    };

    let schedule = custom_schedule(
        Option::Some(registration_period), game_period, MIN_SUBMISSION_PERIOD.into(),
    );

    // This should panic because the first tournament hasn't been settled yet
    contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );
}

#[test]
fn test_create_tournament_gated_by_multiple_tournaments() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create first tournament
    let (first_tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    // Create second tournament
    let (second_tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter and complete first tournament
    let (first_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(first_tournament.id, 'test_player1', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.game.end_game(first_entry_token_id, 10);
    contracts.tournament.submit_scores(first_tournament.id, array![first_entry_token_id]);

    // Enter and complete second tournament
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());
    let (second_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(second_tournament.id, 'test_player2', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.game.end_game(second_entry_token_id, 20);
    contracts.tournament.submit_scores(second_tournament.id, array![second_entry_token_id]);

    // Settle tournaments
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // Create tournament gated by both previous tournaments
    let entry_requirement = EntryRequirement::tournament(
        TournamentType::winners(array![first_tournament.id, second_tournament.id].span()),
    );

    let entry_config = EntryConfig {
        fee: Option::None, requirement: Option::Some(entry_requirement),
    };

    let current_time = get_block_timestamp();

    let schedule = Schedule {
        registration: Option::Some(
            Period { start: current_time, end: current_time + MIN_REGISTRATION_PERIOD.into() },
        ),
        game: Period {
            start: current_time + MIN_REGISTRATION_PERIOD.into(),
            end: current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
        },
        submission_period: MIN_SUBMISSION_PERIOD.into(),
    };

    let (gated_tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );

    assert(
        gated_tournament.entry_config == Option::Some(entry_config), 'Invalid tournament gate type',
    );

    testing::set_block_timestamp(current_time + MIN_REGISTRATION_PERIOD.into() - 1);

    let first_qualifying_token_id = Option::Some(first_entry_token_id.into());
    let second_qualifying_token_id = Option::Some(second_entry_token_id.into());
    // This should succeed since we completed both required tournaments
    contracts
        .tournament
        .enter_tournament(gated_tournament.id, 'test_player3', OWNER(), first_qualifying_token_id);
    contracts
        .tournament
        .enter_tournament(gated_tournament.id, 'test_player4', OWNER(), second_qualifying_token_id);

    // Verify entry was successful
    let entries = contracts.tournament.tournament_entries(gated_tournament.id);
    assert(entries == 2, 'Invalid entry count');
}

#[test]
fn test_allowlist_gated_tournament() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create array of allowed accounts
    let allowed_player1 = starknet::contract_address_const::<0x456>();
    let allowed_player2 = starknet::contract_address_const::<0x789>();
    let allowed_accounts = array![OWNER(), allowed_player1, allowed_player2].span();

    // Create tournament gated by account list
    let entry_requirement = EntryRequirement::allowlist(allowed_accounts);

    let entry_config = EntryConfig {
        fee: Option::None, requirement: Option::Some(entry_requirement),
    };

    let (tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );

    // Verify tournament was created with correct gating
    assert(tournament.entry_config == Option::Some(entry_config), 'Invalid tournament gate type');

    assert(
        tournament.entry_config.unwrap().requirement == Option::Some(entry_requirement),
        'Invalid entry requirement',
    );

    // Start tournament entries
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Allowed account (owner) can enter
    contracts.tournament.enter_tournament(tournament.id, 'test_player1', OWNER(), Option::None);

    // Allowed player can enter
    utils::impersonate(allowed_player1);
    contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player2', allowed_player1, Option::None);

    // Verify entries were successful
    let entries = contracts.tournament.tournament_entries(tournament.id);
    assert(entries == 2, 'Invalid entry count');
}

#[test]
#[should_panic(expected: ("Tournament: Caller is not in allowlist", 'ENTRYPOINT_FAILED'))]
fn test_allowlist_gated_tournament_unauthorized() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create array of allowed accounts (not including player2)
    let allowed_player = starknet::contract_address_const::<0x456>();
    let allowed_accounts = array![OWNER(), allowed_player].span();

    // Create tournament gated by account list
    let entry_requirement = EntryRequirement::allowlist(allowed_accounts);

    let entry_config = EntryConfig {
        fee: Option::None, requirement: Option::Some(entry_requirement),
    };

    let (tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );

    // Start tournament entries
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Try to enter with unauthorized account
    let unauthorized_player = starknet::contract_address_const::<0x789>();
    utils::impersonate(unauthorized_player);

    // This should panic since unauthorized_player is not in the allowed accounts list
    contracts
        .tournament
        .enter_tournament(
            tournament.id, 'test_player_unauthorized', unauthorized_player, Option::None,
        );
}

#[test]
fn test_create_tournament_season() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let schedule = Schedule {
        registration: Option::None,
        game: Period { start: TEST_START_TIME().into(), end: TEST_END_TIME().into() },
        submission_period: MIN_SUBMISSION_PERIOD.into(),
    };

    let (tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::None,
        );

    // verify tournament was created with correct schedule
    assert(tournament.schedule == schedule, 'Invalid tournament schedule');
}

// //
// // Test registering tokens
// //

// // #[test]
// // fn test_register_token() {
// //     let (_world, mut tournament, _loot_survivor, _pragma, _eth, _lords, mut erc20, mut
// // erc721,) =
// //         setup();

// //     utils::impersonate(OWNER());
// //     erc20.approve(tournament.contract_address, 1);
// //     erc721.approve(tournament.contract_address, 1);
// //     let tokens = array![
// //         Token {
// //             token: erc20.contract_address,
// //             token_type: TokenType::erc20(ERC20Data { amount: 1 })
// //         },
// //         Token {
// //             token: erc721.contract_address,
// //             token_type: TokenType::erc721(ERC721Data { id: 1 })
// //         },
// //     ];

// //     tournament.register_tokens(tokens);
// //     assert(erc20.balance_of(OWNER()) == 1000000000000000000000, 'Invalid balance');
// //     assert(erc721.balance_of(OWNER()) == 1, 'Invalid balance');
// //     assert(tournament.is_token_registered(erc20.contract_address), 'Invalid registration');
// //     assert(tournament.is_token_registered(erc721.contract_address), 'Invalid registration');
// // }

// // #[test]
// // #[should_panic(expected: ('token already registered', 'ENTRYPOINT_FAILED'))]
// // fn test_register_token_already_registered() {
// //     let (_world, mut tournament, _loot_survivor, _pragma, _eth, _lords, mut erc20, mut erc721,
// // _golden_token, _blobert) =
// //         setup();

// //     utils::impersonate(OWNER());
// //     erc20.approve(tournament.contract_address, 1);
// //     erc721.approve(tournament.contract_address, 1);
// //     let tokens = array![
// //         Token {
// //             token: erc20.contract_address,
// //             token_type: TokenType::erc20(ERC20Data { amount: 1 })
// //         },
// //         Token {
// //             token: erc721.contract_address,
// //             token_type: TokenType::erc721(ERC721Data { id: 1 })
// //         },
// //     ];

// //     tournament.register_tokens(tokens);
// //     let tokens = array![
// //         Token {
// //             token: erc20.contract_address,
// //             token_type: TokenType::erc20(ERC20Data { amount: 1 })
// //         },
// //         Token {
// //             token: erc721.contract_address,
// //             token_type: TokenType::erc721(ERC721Data { id: 1 })
// //         },
// //     ];
// //     tournament.register_tokens(tokens);
// // }

//
// Test entering tournaments
//

#[test]
fn test_enter_tournament() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let (tournament, creator_game_token_id) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    // assert the returned creator game token id has the correct registration information
    let token = contracts.tournament.get_registration(tournament.id, creator_game_token_id);
    assert!(
        token.tournament_id == tournament.id,
        "Wrong tournament id, expected: {}, got: {}",
        tournament.id,
        token.tournament_id,
    );
    assert!(token.entry_number == 0, "Entry number should be 0");
    assert!(token.has_submitted == false, "submitted score should be false");

    // assert we own the minted game token for the creator
    assert!(
        contracts.game.owner_of(creator_game_token_id.into()) == OWNER(),
        "Wrong ownership for creator game token",
    );

    // advance time to registration start time
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // enter tournament
    let (game_token_id, entry_number) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player', OWNER(), Option::None);

    // assert we own the minted game token
    assert!(
        contracts.game.owner_of(game_token_id.into()) == OWNER(), "Wrong ownership for game token",
    );

    // verify registration information
    let player1_registration = contracts.tournament.get_registration(tournament.id, game_token_id);

    assert!(
        player1_registration.tournament_id == tournament.id,
        "Wrong tournament id for player 1, expected: {}, got: {}",
        tournament.id,
        player1_registration.tournament_id,
    );
    assert!(player1_registration.entry_number == 1, "Entry number should be 1");
    assert!(
        player1_registration.entry_number == entry_number,
        "Invalid entry number for player 1, expected: {}, got: {}",
        entry_number,
        player1_registration.entry_number,
    );
    assert!(player1_registration.has_submitted == false, "submitted score should be false");
}

#[test]
#[should_panic(
    expected: ("Tournament: game token id 3 does not qualify for tournament", 'ENTRYPOINT_FAILED'),
)]
fn test_use_host_token_to_qualify_into_tournament_gated_tournament() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // First create and complete a tournament that will be used as a gate
    let (first_tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Complete the first tournament
    let (first_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(first_tournament.id, 'test_player', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.game.end_game(first_entry_token_id, 100);
    contracts.tournament.submit_scores(first_tournament.id, array![first_entry_token_id]);

    // Settle first tournament
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // assert first_entry_token_id is in the leaderboard
    let leaderboard = contracts.tournament.get_leaderboard(first_tournament.id);
    let first_place = *leaderboard.at(0);
    assert!(
        first_place == first_entry_token_id,
        "Invalid first place for first tournament. Expected: {}, got: {}",
        first_place,
        first_entry_token_id,
    );

    // Create a tournament gated by the previous tournament
    let entry_requirement = EntryRequirement::tournament(
        TournamentType::winners(array![first_tournament.id].span()),
    );

    let entry_config = EntryConfig {
        fee: Option::None, requirement: Option::Some(entry_requirement),
    };

    let current_time = get_block_timestamp();

    let schedule = Schedule {
        registration: Option::Some(
            Period { start: current_time, end: current_time + MIN_REGISTRATION_PERIOD.into() },
        ),
        game: Period {
            start: current_time + MIN_REGISTRATION_PERIOD.into(),
            end: current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
        },
        submission_period: MIN_SUBMISSION_PERIOD.into(),
    };

    let (second_tournament, second_tournament_creator_token_id) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );

    // attempt to join second tournament using the host token, should panic
    let wrong_submission_type = Option::Some(second_tournament_creator_token_id.into());
    contracts
        .tournament
        .enter_tournament(second_tournament.id, 'test_player', OWNER(), wrong_submission_type);
}


#[test]
#[should_panic(
    expected: ("Tournament: game token id 3 does not qualify for tournament", 'ENTRYPOINT_FAILED'),
)]
fn test_enter_tournament_wrong_submission_type() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // First create and complete a tournament that will be used as a gate
    let (first_tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Complete the first tournament
    let (first_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(first_tournament.id, 'test_player', OWNER(), Option::None);

    let (second_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(first_tournament.id, 'test_player', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.game.end_game(first_entry_token_id, 100);
    contracts.game.end_game(second_entry_token_id, 10);
    contracts.tournament.submit_scores(first_tournament.id, array![first_entry_token_id]);

    // Settle first tournament
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // assert first_entry_token_id is in the leaderboard
    let leaderboard = contracts.tournament.get_leaderboard(first_tournament.id);
    let first_place = *leaderboard.at(0);
    assert!(
        first_place == first_entry_token_id,
        "Invalid first place for first tournament. Expected: {}, got: {}",
        first_place,
        first_entry_token_id,
    );

    // Create a tournament gated by the previous tournament
    let entry_requirement = EntryRequirement::tournament(
        TournamentType::winners(array![first_tournament.id].span()),
    );

    let entry_config = EntryConfig {
        fee: Option::None, requirement: Option::Some(entry_requirement),
    };

    let current_time = get_block_timestamp();

    let schedule = Schedule {
        registration: Option::Some(
            Period { start: current_time, end: current_time + MIN_REGISTRATION_PERIOD.into() },
        ),
        game: Period {
            start: current_time + MIN_REGISTRATION_PERIOD.into(),
            end: current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
        },
        submission_period: MIN_SUBMISSION_PERIOD.into(),
    };

    let (second_tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );

    // attempt to join second tournament using token that did not win first tournament, should panic
    let wrong_submission_type = Option::Some(second_entry_token_id.into());
    contracts
        .tournament
        .enter_tournament(second_tournament.id, 'test_player', OWNER(), wrong_submission_type);
}

#[test]
fn test_enter_tournament_season() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let schedule = test_season_schedule();

    let (tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::None,
        );

    testing::set_block_timestamp(TEST_START_TIME().into());

    let (game_token_id, entry_number) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player', OWNER(), Option::None);

    assert!(entry_number == 1, "Invalid entry number");

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(game_token_id, 10);
    contracts.tournament.submit_scores(tournament.id, array![game_token_id]);

    // verify finished first
    let winners = contracts.tournament.get_leaderboard(tournament.id);
    assert(winners.len() == 1, 'Invalid number of winners');
    assert(*winners.at(0) == game_token_id, 'Invalid winner');
}

//
// Test submitting scores
//

#[test]
fn test_submit_scores() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let (tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(1, 10);

    contracts.tournament.submit_scores(tournament.id, array![entry_token_id]);
}

#[test]
fn test_submit_multiple_scores() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let mut game_config = test_game_config(contracts.game.contract_address);
    game_config.prize_spots = 3;

    let (tournament, _) = contracts
        .tournament
        .create_tournament(test_metadata(), test_schedule(), game_config, Option::None);

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (first_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player1', OWNER(), Option::None);
    let (second_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player2', OWNER(), Option::None);
    let (third_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player3', OWNER(), Option::None);
    let (fourth_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player4', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(first_entry_token_id, 1);
    contracts.game.end_game(second_entry_token_id, 2);
    contracts.game.end_game(third_entry_token_id, 5);
    contracts.game.end_game(fourth_entry_token_id, 1);

    contracts
        .tournament
        .submit_scores(
            tournament.id,
            array![third_entry_token_id, second_entry_token_id, first_entry_token_id],
        );
}

#[test]
fn test_submit_scores_earliest_submission_wins() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let mut game_config = test_game_config(contracts.game.contract_address);
    game_config.prize_spots = 2;

    let (tournament, _) = contracts
        .tournament
        .create_tournament(test_metadata(), test_schedule(), game_config, Option::None);

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Complete tournament with tied scores but different death dates
    let (first_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player1', OWNER(), Option::None);
    let (second_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player2', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(1, 1);
    contracts.game.end_game(2, 1);

    contracts
        .tournament
        .submit_scores(tournament.id, array![second_entry_token_id, first_entry_token_id]);
}

#[test]
#[should_panic(expected: ("Tournament: Tournament 1 is finalized", 'ENTRYPOINT_FAILED'))]
fn test_submit_scores_after_submission_period() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create tournament with specific timing
    let (tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter tournament
    let (entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_START_TIME().into());

    contracts.game.end_game(1, 1);

    // Move timestamp to after submission period ends
    // Tournament end (3 + MIN_REGISTRATION_PERIOD) + submission period
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // This should panic with 'tournament already settled'
    contracts.tournament.submit_scores(tournament.id, array![entry_token_id]);
}

#[test]
#[should_panic(expected: ("Tournament: Tournament id 1 has not ended", 'ENTRYPOINT_FAILED'))]
fn test_submit_scores_before_tournament_ends() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let mut game_config = test_game_config(contracts.game.contract_address);
    game_config.prize_spots = 3;

    // Create tournament with future start time
    let (tournament, _) = contracts
        .tournament
        .create_tournament(test_metadata(), test_schedule(), game_config, Option::None);

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter tournament
    let (entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_START_TIME().into());

    // Create adventurer with score
    contracts.game.end_game(1, 1);

    // Attempt to submit scores before tournament starts
    // This should panic with 'tournament not started'
    contracts.tournament.submit_scores(tournament.id, array![entry_token_id]);
}

#[test]
fn test_submit_scores_replace_lower_score() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let mut game_config = test_game_config(contracts.game.contract_address);
    game_config.prize_spots = 3;

    // Create tournament with multiple top scores
    let (tournament, _) = contracts
        .tournament
        .create_tournament(test_metadata(), test_schedule(), game_config, Option::None);

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Create multiple players
    let player2 = starknet::contract_address_const::<0x456>();
    let player3 = starknet::contract_address_const::<0x789>();

    // Enter tournament with all players
    let (first_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player1', OWNER(), Option::None);

    utils::impersonate(player2);
    let (second_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player2', OWNER(), Option::None);

    utils::impersonate(player3);
    let (third_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player3', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(1, 5); // Owner's game
    contracts.game.end_game(2, 10); // Player2's game
    contracts.game.end_game(3, 15); // Player3's game

    utils::impersonate(OWNER());
    contracts.tournament.submit_scores(tournament.id, array![first_entry_token_id]);

    utils::impersonate(player2);
    contracts
        .tournament
        .submit_scores(
            tournament.id,
            array![first_entry_token_id, third_entry_token_id, second_entry_token_id],
        );
}

//
// Test distributing rewards
//

#[test]
fn test_claim_prizes_with_sponsored_prizes() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let (tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    // register_tokens_for_test(tournament, erc20, erc721);

    contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.tournament.contract_address, 1);
    let first_prize_id = contracts
        .tournament
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenType::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            1,
        );
    let second_prize_id = contracts
        .tournament
        .add_prize(
            tournament.id,
            contracts.erc721.contract_address,
            TokenType::erc721(ERC721Data { id: 1 }),
            1,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(1, 1);

    contracts.tournament.submit_scores(tournament.id, array![entry_token_id]);

    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
    contracts.tournament.claim_prize(tournament.id, PrizeType::Sponsored(first_prize_id));
    contracts.tournament.claim_prize(tournament.id, PrizeType::Sponsored(second_prize_id));

    // check balances of owner after claiming prizes
    assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE, 'Invalid balance');
    assert(contracts.erc721.owner_of(1) == OWNER(), 'Invalid owner');
}

#[test]
#[should_panic(expected: ("Tournament: Prize has already been claimed", 'ENTRYPOINT_FAILED'))]
fn test_claim_prizes_prize_already_claimed() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let (tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.tournament.contract_address, 1);
    let first_prize_id = contracts
        .tournament
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenType::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            1,
        );

    contracts
        .tournament
        .add_prize(
            tournament.id,
            contracts.erc721.contract_address,
            TokenType::erc721(ERC721Data { id: 1 }),
            1,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(1, 1);

    contracts.tournament.submit_scores(tournament.id, array![entry_token_id]);

    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
    contracts.tournament.claim_prize(tournament.id, PrizeType::Sponsored(first_prize_id));
    contracts.tournament.claim_prize(tournament.id, PrizeType::Sponsored(first_prize_id));
}

#[test]
fn test_claim_prizes_with_gated_tokens_criteria() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let entry_requirement = EntryRequirement::token(contracts.erc721.contract_address);

    let entry_config = EntryConfig {
        fee: Option::None, requirement: Option::Some(entry_requirement),
    };

    let (tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );

    assert(tournament.entry_config == Option::Some(entry_config), 'Invalid entry config');

    assert(
        tournament.entry_config.unwrap().requirement == Option::Some(entry_requirement),
        'Invalid entry requirement',
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player', OWNER(), Option::Some(1));

    testing::set_block_timestamp(TEST_START_TIME().into());

    // check tournament entries
    assert(contracts.tournament.tournament_entries(tournament.id) == 1, 'Invalid entries');
    // check owner now has game token
    assert(contracts.game.owner_of(entry_token_id.into()) == OWNER(), 'Invalid owner');

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(entry_token_id, 1);

    contracts.tournament.submit_scores(tournament.id, array![entry_token_id]);
}

#[test]
fn test_claim_prizes_with_gated_tokens_uniform() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let entry_requirement = EntryRequirement::token(contracts.erc721.contract_address);

    let entry_config = EntryConfig {
        fee: Option::None, requirement: Option::Some(entry_requirement),
    };

    let (tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );

    assert(tournament.entry_config == Option::Some(entry_config), 'Invalid entry config');

    assert(
        tournament.entry_config.unwrap().requirement == Option::Some(entry_requirement),
        'Invalid entry requirement',
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player', OWNER(), Option::Some(1));

    // check tournament entries
    assert(contracts.tournament.tournament_entries(tournament.id) == 1, 'Invalid entries');
    // check owner now has game token
    assert(contracts.game.owner_of(entry_token_id.into()) == OWNER(), 'Invalid owner');

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(entry_token_id, 1);

    contracts.tournament.submit_scores(tournament.id, array![entry_token_id]);
}

#[test]
fn test_claim_prizes_with_gated_tournaments() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let (first_tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .tournament
        .enter_tournament(first_tournament.id, 'test_player1', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(entry_token_id, 1);

    contracts.tournament.submit_scores(first_tournament.id, array![entry_token_id]);

    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // verify entry token id won the first tournament
    let leaderboard = contracts.tournament.get_leaderboard(first_tournament.id);
    assert!(
        *leaderboard.at(0) == entry_token_id,
        "Wrong leaderboard for first tournament. Expected: {}, got: {}",
        entry_token_id,
        *leaderboard.at(0),
    );

    // create a new tournament that is restricted to winners of the first tournament
    let entry_requirement = EntryRequirement::tournament(
        TournamentType::winners(array![first_tournament.id].span()),
    );

    let entry_config = EntryConfig {
        fee: Option::None, requirement: Option::Some(entry_requirement),
    };

    let current_time = get_block_timestamp();

    let schedule = Schedule {
        registration: Option::Some(
            Period { start: current_time, end: current_time + MIN_REGISTRATION_PERIOD.into() },
        ),
        game: Period {
            start: current_time + MIN_REGISTRATION_PERIOD.into(),
            end: current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
        },
        submission_period: MIN_SUBMISSION_PERIOD.into(),
    };

    let (second_tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );

    assert(second_tournament.entry_config == Option::Some(entry_config), 'Invalid entry config');
    assert(
        second_tournament.entry_config.unwrap().requirement == Option::Some(entry_requirement),
        'Invalid entry requirement',
    );

    testing::set_block_timestamp(current_time);

    let (second_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(
            second_tournament.id, 'test_player2', OWNER(), Option::Some(entry_token_id.into()),
        );

    testing::set_block_timestamp(
        current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
    );

    contracts.game.end_game(second_entry_token_id, 1);

    contracts.tournament.submit_scores(second_tournament.id, array![second_entry_token_id]);
}

#[test]
fn test_claim_prizes_with_premiums() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let entry_fee = EntryFee {
        token_address: contracts.erc20.contract_address,
        amount: 1,
        distribution: array![100].span(),
        tournament_creator_share: Option::None,
        game_creator_share: Option::None,
    };

    let entry_config = EntryConfig { fee: Option::Some(entry_fee), requirement: Option::None };

    let (tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );

    assert(tournament.entry_config == Option::Some(entry_config), 'Invalid entry premium');

    // handle approval for the premium
    contracts.erc20.approve(contracts.tournament.contract_address, 1);

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player', OWNER(), Option::None);

    // check owner now has 1 less premium token
    assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE - 1, 'Invalid balance');

    // check tournament now has premium funds
    assert(
        contracts.erc20.balance_of(contracts.tournament.contract_address) == 1, 'Invalid balance',
    );

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(entry_token_id, 1);

    contracts.tournament.submit_scores(tournament.id, array![entry_token_id]);

    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // claim entry fee prize for first place
    contracts.tournament.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(1)));

    // check owner now has all premium funds back
    assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE, 'Invalid balance');
}

#[test]
fn test_claim_prizes_with_premium_creator_fee() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create entry fee with 10% creator fee and 90% to winner
    let entry_fee = EntryFee {
        token_address: contracts.erc20.contract_address,
        amount: 100, // 100 tokens per entry
        distribution: array![90].span(), // 90% to winner
        tournament_creator_share: Option::Some(10),
        game_creator_share: Option::None,
    };

    let entry_config = EntryConfig { fee: Option::Some(entry_fee), requirement: Option::None };

    let (tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.game.contract_address),
            Option::Some(entry_config),
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter tournament with two players
    utils::impersonate(OWNER());
    contracts.erc20.approve(contracts.tournament.contract_address, 100);
    let (first_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player1', OWNER(), Option::None);

    let player2 = starknet::contract_address_const::<0x456>();
    utils::impersonate(player2);
    contracts.erc20.mint(player2, 100);
    contracts.erc20.approve(contracts.tournament.contract_address, 100);
    let (player2_game_token, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player2', player2, Option::None);

    let creator_initial_balance = contracts.erc20.balance_of(OWNER());

    testing::set_block_timestamp(TEST_END_TIME().into());

    // Set scores (player2 wins)
    contracts.game.end_game(first_entry_token_id, 1);
    contracts.game.end_game(player2_game_token, 2);

    utils::impersonate(OWNER());

    contracts.tournament.submit_scores(tournament.id, array![player2_game_token]);

    // Advance time to tournament submission period
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // Claim creator fee
    contracts.tournament.claim_prize(tournament.id, PrizeType::EntryFees(Role::TournamentCreator));

    // Verify creator fee distribution (10% of 200 total = 20)
    assert(
        contracts.erc20.balance_of(OWNER()) == creator_initial_balance + 20, 'Invalid creator fee',
    );

    // Check initial balances
    let winner_initial_balance = contracts.erc20.balance_of(player2);

    contracts.tournament.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(1)));

    // Verify winner prize distribution (90% of 200 total = 180)
    assert!(
        contracts.erc20.balance_of(player2) == winner_initial_balance + 180,
        "Invalid winner distribution, expected: {}, actual: {}",
        winner_initial_balance + 180,
        contracts.erc20.balance_of(player2),
    );
}

#[test]
fn test_claim_prizes_with_premium_multiple_winners() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create premium with 10% creator fee and split remaining 90% between top 3:
    // 1st: 50%, 2nd: 30%, 3rd: 20%
    let entry_fee = EntryFee {
        token_address: contracts.erc20.contract_address,
        amount: 100, // 100 tokens per entry
        distribution: array![50, 25, 15].span(), // Distribution percentages
        tournament_creator_share: Option::Some(10),
        game_creator_share: Option::None,
    };

    let entry_config = EntryConfig { fee: Option::Some(entry_fee), requirement: Option::None };

    let mut game_config = test_game_config(contracts.game.contract_address);
    game_config.prize_spots = 3;

    let (tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(), test_schedule(), game_config, Option::Some(entry_config),
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Create and enter with 4 players
    let player2 = starknet::contract_address_const::<0x456>();
    let player3 = starknet::contract_address_const::<0x789>();
    let player4 = starknet::contract_address_const::<0x101>();

    // Owner enters
    utils::impersonate(OWNER());
    contracts.erc20.approve(contracts.tournament.contract_address, 100);
    let (first_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player1', OWNER(), Option::None);

    // Player 2 enters
    utils::impersonate(player2);
    contracts.erc20.mint(player2, 200);
    contracts.erc20.approve(contracts.tournament.contract_address, 100);
    let (second_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player2', player2, Option::None);

    // Player 3 enters
    utils::impersonate(player3);
    contracts.erc20.mint(player3, 100);
    contracts.erc20.approve(contracts.tournament.contract_address, 100);
    let (third_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player3', player3, Option::None);

    // Player 4 enters
    utils::impersonate(player4);
    contracts.erc20.mint(player4, 100);
    contracts.erc20.approve(contracts.tournament.contract_address, 100);
    let (fourth_entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player4', player4, Option::None);

    testing::set_block_timestamp(TEST_START_TIME().into());

    let third_initial = contracts.erc20.balance_of(OWNER());

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.game.end_game(second_entry_token_id, 100); // player2's game
    contracts.game.end_game(third_entry_token_id, 75); // player3's game
    contracts.game.end_game(first_entry_token_id, 50); // owner's game
    contracts.game.end_game(fourth_entry_token_id, 25); // player4's game

    // Submit scores
    utils::impersonate(player2);
    contracts
        .tournament
        .submit_scores(
            tournament.id,
            array![second_entry_token_id, third_entry_token_id, first_entry_token_id],
        );

    // Store initial balances
    let first_initial = contracts.erc20.balance_of(player2);
    let second_initial = contracts.erc20.balance_of(player3);

    // Claim rewards
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
    // 3 premium prizes
    contracts.tournament.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(1)));
    contracts.tournament.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(2)));
    contracts.tournament.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(3)));
    contracts.tournament.claim_prize(tournament.id, PrizeType::EntryFees(Role::TournamentCreator));

    // Total pool = 4 players * 100 tokens = 400 tokens
    // 1st place (50%) = 200 tokens
    // 2nd place (25%) = 100 tokens
    // 3rd place (15%) = 60 tokens
    //     + creator reward (10%) = 40 tokens
    // Verify winner distributions
    let first_expected = first_initial + 200;
    let second_expected = second_initial + 100;
    let third_expected = third_initial + 60 + 40;
    assert!(
        contracts.erc20.balance_of(player2) == first_expected,
        "Invalid first distribution, expected: {}, actual: {}",
        first_expected,
        contracts.erc20.balance_of(player2),
    );
    assert!(
        contracts.erc20.balance_of(player3) == second_expected,
        "Invalid second distribution, expected: {}, actual: {}",
        second_expected,
        contracts.erc20.balance_of(player3),
    );
    assert!(
        contracts.erc20.balance_of(OWNER()) == third_expected,
        "Invalid third distribution, expected: {}, actual: {}",
        third_expected,
        contracts.erc20.balance_of(OWNER()),
    );
}

// TODO: Revisit this test case when we have a way to claim unclaimable prizes
// #[test]
// fn test_tournament_with_no_submissions() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//

//     // Create tournament with prizes and premium
//     let entry_fee = EntryFee {
//         token_address: contracts.erc20.contract_address,
//         amount: 100,
//         distribution: array![100].span(), // 100% to winner
//         creator_fee: 10 // 10% creator fee
//     };

//     let (tournament, _) = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             3, // Track top 3 scores
//             Option::None,
//             Option::Some(entry_fee),
//             contracts.game.contract_address,
//             1,
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     // Add some prizes
//     contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
//     contracts.erc721.approve(contracts.tournament.contract_address, 1);
//     let first_prize_id = contracts
//         .tournament
//         .add_prize(
//             tournament.id,
//             contracts.erc20.contract_address,
//             TokenType::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
//             1,
//         );
//     let second_prize_id = contracts
//         .tournament
//         .add_prize(
//             tournament.id,
//             contracts.erc721.contract_address,
//             TokenType::erc721(ERC721Data { id: 1 }),
//             1,
//         );

//     // Create multiple players
//     let player2 = starknet::contract_address_const::<0x456>();
//     let player3 = starknet::contract_address_const::<0x789>();

//     // Enter tournament with all players
//     contracts.erc20.mint(OWNER(), 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament.id, 'test_player1', OWNER(), Option::None);

//     utils::impersonate(player2);
//     contracts.erc20.mint(player2, 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament.id, 'test_player2', OWNER(), Option::None);

//     utils::impersonate(player3);
//     contracts.erc20.mint(player3, 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament.id, 'test_player3', OWNER(), Option::None);

//     // Store initial balances
//     let creator_initial = contracts.erc20.balance_of(OWNER());

//     // Move to after tournament and submission period without any score submissions
//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

//     // Claim rewards
//     utils::impersonate(OWNER());
//     // 2 deposited prizes and 1 tournament premium prize
//     contracts.tournament.claim_prize(tournament.id, PrizeType::Sponsored(first_prize_id));
//     contracts.tournament.claim_prize(tournament.id, PrizeType::Sponsored(second_prize_id));
//     contracts.tournament.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(1)));

//     // Verify first caller gets all prizes
//     // creator also gets the prize balance back (STARTING BALANCE)
//     assert(
//         contracts.erc20.balance_of(OWNER()) == creator_initial + 300 + STARTING_BALANCE,
//         'Invalid owner refund',
//     );
//     assert(contracts.erc20.balance_of(player2) == 0, 'Invalid player2 refund');
//     assert(contracts.erc20.balance_of(player3) == 0, 'Invalid player3 refund');

//     // Verify prize returns to tournament creator
//     assert(contracts.erc721.owner_of(1) == OWNER(), 'Prize should return to caller');
// }

#[test]
fn test_claim_prizes_season() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let (tournament, _) = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address,
    );

    contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.tournament.contract_address, 1);
    let first_prize_id = contracts
        .tournament
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenType::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            1,
        );
    let second_prize_id = contracts
        .tournament
        .add_prize(
            tournament.id,
            contracts.erc721.contract_address,
            TokenType::erc721(ERC721Data { id: 1 }),
            1,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .tournament
        .enter_tournament(tournament.id, 'test_player1', OWNER(), Option::None);

    testing::set_block_timestamp(TEST_START_TIME().into());

    contracts.game.end_game(entry_token_id, 1);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.tournament.submit_scores(tournament.id, array![entry_token_id]);

    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
    contracts.tournament.claim_prize(tournament.id, PrizeType::Sponsored(first_prize_id));
    contracts.tournament.claim_prize(tournament.id, PrizeType::Sponsored(second_prize_id));

    // check balances of owner after claiming prizes
    assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE, 'Invalid balance');
    assert(contracts.erc721.owner_of(1) == OWNER(), 'Invalid owner');
}

// #[derive(Copy, Drop, Serde, Introspect)]
// pub struct Schedule {
//     pub registration: Option<Period>,
//     pub game: Period,
//     pub submission_period: u64,
// }

// #[derive(Copy, Drop, Serde, Introspect)]
// pub struct Period {
//     pub start: u64,
//     pub end: u64,
// }

#[test]
fn test_state_transitions() {
    let contracts = setup();
    utils::impersonate(OWNER());

    let registration_start_time = 1000;
    let registration_end_time = 10000;
    let tournament_start_time = 20000;
    let tournament_end_time = 30000;
    let submission_period = 86400;

    let schedule = Schedule {
        registration: Option::Some(
            Period { start: registration_start_time, end: registration_end_time },
        ),
        game: Period { start: tournament_start_time, end: tournament_end_time },
        submission_period: submission_period,
    };

    // Create tournament
    let (tournament, _) = contracts
        .tournament
        .create_tournament(
            test_metadata(),
            schedule,
            test_game_config(contracts.game.contract_address),
            Option::None,
        );

    // Test Scheduled state (before registration)
    testing::set_block_timestamp(registration_start_time - 1);
    assert!(
        contracts.tournament.get_state(tournament.id) == TournamentState::Scheduled,
        "Tournament should be in Scheduled state",
    );

    // Test Registration state
    testing::set_block_timestamp(registration_start_time);
    assert!(
        contracts.tournament.get_state(tournament.id) == TournamentState::Registration,
        "Tournament should be in Registration state at start",
    );

    testing::set_block_timestamp(registration_end_time - 1);
    assert!(
        contracts.tournament.get_state(tournament.id) == TournamentState::Registration,
        "Tournament should be in Registration state before end",
    );

    // Test Staging state (between registration end and tournament start)
    testing::set_block_timestamp(registration_end_time);
    assert!(
        contracts.tournament.get_state(tournament.id) == TournamentState::Staging,
        "Tournament should be in Staging state after registration",
    );

    testing::set_block_timestamp(tournament_start_time - 1);
    assert!(
        contracts.tournament.get_state(tournament.id) == TournamentState::Staging,
        "Tournament should be in Staging state before start",
    );

    // Test Live state
    testing::set_block_timestamp(tournament_start_time);
    assert!(
        contracts.tournament.get_state(tournament.id) == TournamentState::Live,
        "Tournament should be in Live state at start",
    );

    testing::set_block_timestamp(tournament_end_time - 1);
    assert!(
        contracts.tournament.get_state(tournament.id) == TournamentState::Live,
        "Tournament should be in Live state before end",
    );

    // Test Submission state
    testing::set_block_timestamp(tournament_end_time);
    assert!(
        contracts.tournament.get_state(tournament.id) == TournamentState::Submission,
        "Tournament should be in Submission state after end",
    );

    // just before submission period ends
    testing::set_block_timestamp(tournament_end_time + submission_period - 1);
    assert!(
        contracts.tournament.get_state(tournament.id) == TournamentState::Submission,
        "Tournament should be in Submission state before submission period ends",
    );

    // Submission is over, so tournament should be finalized
    testing::set_block_timestamp(tournament_end_time + submission_period);
    assert!(
        contracts.tournament.get_state(tournament.id) == TournamentState::Finalized,
        "Tournament should be in Finalized state after submission period",
    );
}
