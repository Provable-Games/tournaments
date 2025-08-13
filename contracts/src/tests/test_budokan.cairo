// SPDX-License-Identifier: UNLICENSED

use core::option::Option;
use starknet::{ContractAddress, get_block_timestamp, testing};
use dojo::world::{WorldStorage, WorldStorageTrait};
use dojo_cairo_test::{
    spawn_test_world, deploy_contract, NamespaceDef, TestResource, ContractDefTrait, ContractDef,
    WorldStorageTestTrait,
};

use budokan::constants::{
    MIN_REGISTRATION_PERIOD, MIN_SUBMISSION_PERIOD, MAX_SUBMISSION_PERIOD, MIN_TOURNAMENT_LENGTH,
    DEFAULT_NS,
};
use budokan::libs::store::{Store as BudokanStore, StoreTrait as BudokanStoreTrait};
use budokan::constants::{VERSION};

use budokan::models::{
    budokan::{
        m_Tournament, m_Registration, m_EntryCount, m_Leaderboard, m_Prize, m_Token,
        m_TournamentConfig, m_PrizeMetrics, m_PlatformMetrics, m_TournamentTokenMetrics,
        m_PrizeClaim, m_QualificationEntries, ERC20Data, ERC721Data, EntryFee, TokenType,
        EntryRequirement, EntryRequirementType, TournamentType, Prize, PrizeType, Role,
        QualificationProof, TournamentQualification, NFTQualification, TokenData, TokenTypeData,
    },
};
use budokan::models::schedule::{Schedule, Period, Phase};

use budokan::tests::{
    utils,
    constants::{
        OWNER, TOURNAMENT_NAME, TOURNAMENT_DESCRIPTION, STARTING_BALANCE,
        TEST_REGISTRATION_START_TIME, TEST_REGISTRATION_END_TIME, TEST_START_TIME, TEST_END_TIME,
    },
};
use budokan::tests::helpers::{
    create_basic_tournament, test_metadata, test_game_config, test_schedule, custom_schedule,
    test_game_period, registration_period_too_short, registration_period_too_long,
    registration_open_beyond_tournament_end, test_season_schedule, tournament_too_long,
};
use budokan::tests::mocks::{erc20_mock::erc20_mock, erc721_mock::erc721_mock};
use budokan::budokan::Budokan;
use budokan::tests::interfaces::{
    IERC20MockDispatcher, IERC20MockDispatcherTrait, IERC721MockDispatcher,
    IERC721MockDispatcherTrait,
};
use budokan::interfaces::{IBudokanDispatcher, IBudokanDispatcherTrait};
use game_components_token::interface::{
    IMinigameTokenMixinDispatcher, IMinigameTokenMixinDispatcherTrait,
};
use game_components_metagame::interface::{IMETAGAME_ID};
use game_components_test_starknet::minigame::mocks::minigame_starknet_mock::{
    IMinigameStarknetMockDispatcher, IMinigameStarknetMockDispatcherTrait,
};

use budokan::tests::setup_denshokan;

use openzeppelin_introspection::interface::{ISRC5Dispatcher, ISRC5DispatcherTrait};
use openzeppelin_token::erc721::{ERC721Component::{Transfer, Approval}};
use openzeppelin_token::erc721::interface::{IERC721Dispatcher, IERC721DispatcherTrait};

#[derive(Drop)]
pub struct TestContracts {
    pub world: WorldStorage,
    pub budokan: IBudokanDispatcher,
    pub minigame: IMinigameStarknetMockDispatcher,
    pub denshokan: IMinigameTokenMixinDispatcher,
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

fn setup_uninitialized(
    denshokan_address: ContractAddress,
) -> (WorldStorage, ContractAddress, ContractAddress) {
    testing::set_block_number(1);
    testing::set_block_timestamp(1);

    let ndef = NamespaceDef {
        namespace: DEFAULT_NS(),
        resources: [
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
            TestResource::Model(m_QualificationEntries::TEST_CLASS_HASH.try_into().unwrap()),
            // contracts
            TestResource::Contract(Budokan::TEST_CLASS_HASH),
        ]
            .span(),
    };

    // deploy systems contract
    let erc20_mock_address = deploy_contract(
        erc20_mock::TEST_CLASS_HASH.try_into().unwrap(), array![].span(),
    );
    let erc721_mock_address = deploy_contract(
        erc721_mock::TEST_CLASS_HASH.try_into().unwrap(), array![].span(),
    );

    // Create token data array for new dojo_init signature
    let mut token_data_array = array![];
    token_data_array
        .append(TokenData { token_address: erc20_mock_address, token_type: TokenType::erc20 });
    token_data_array
        .append(TokenData { token_address: erc721_mock_address, token_type: TokenType::erc721 });

    let mut init_calldata = array![];
    init_calldata.append(false.into()); // safe_mode
    init_calldata.append(false.into()); // test_mode
    init_calldata.append(denshokan_address.into()); // denshokan_address

    // Serialize the token data array
    let mut serialized_tokens = array![];
    token_data_array.serialize(ref serialized_tokens);
    init_calldata.append_span(serialized_tokens.span());

    let mut contract_defs: Array<ContractDef> = array![
        ContractDefTrait::new(@DEFAULT_NS(), @"Budokan")
            .with_writer_of([dojo::utils::bytearray_hash(@DEFAULT_NS())].span())
            .with_init_calldata(init_calldata.span()),
    ];

    let mut world: WorldStorage = spawn_test_world([ndef].span());

    world.sync_perms_and_inits(contract_defs.span());

    (world, erc20_mock_address, erc721_mock_address)
}

pub fn setup() -> TestContracts {
    let denshokan_contracts = setup_denshokan::setup();
    let (world, erc20_mock_address, erc721_mock_address) = setup_uninitialized(
        denshokan_contracts.denshokan.contract_address,
    );

    let budokan_address = match world.dns(@"Budokan") {
        Option::Some((address, _)) => address,
        Option::None => panic!("Budokan contract not found in world DNS"),
    };
    let budokan = IBudokanDispatcher { contract_address: budokan_address };
    let minigame = denshokan_contracts.minigame_mock;
    let denshokan = denshokan_contracts.denshokan;
    let erc20 = IERC20MockDispatcher { contract_address: erc20_mock_address };
    let erc721 = IERC721MockDispatcher { contract_address: erc721_mock_address };

    // mint tokens
    utils::impersonate(OWNER());
    erc20.mint(OWNER(), STARTING_BALANCE);
    erc721.mint(OWNER(), 1);

    minigame.create_settings_difficulty("test_settings", "test_settings", 1);

    // drop all events
    utils::drop_all_events(world.dispatcher.contract_address);
    utils::drop_all_events(budokan.contract_address);
    utils::drop_all_events(minigame.contract_address);
    utils::drop_all_events(denshokan.contract_address);
    utils::drop_all_events(erc20.contract_address);
    utils::drop_all_events(erc721.contract_address);

    TestContracts { world, budokan, minigame, denshokan, erc20, erc721 }
}

//
// Test initializers
//

#[test]
fn initializer() {
    let contracts = setup();

    let src5_dispatcher = ISRC5Dispatcher { contract_address: contracts.budokan.contract_address };
    assert(src5_dispatcher.supports_interface(IMETAGAME_ID) == true, 'should support IMETAGAME_ID');

    assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE, 'Invalid balance');
    assert(contracts.erc721.balance_of(OWNER()) == 1, 'Invalid balance');

    let mut world = contracts.world;
    let store: BudokanStore = BudokanStoreTrait::new(world);

    let tournament_config = store.get_tournament_config(VERSION);
    assert(tournament_config.safe_mode == false, 'Invalid safe mode');
    assert(tournament_config.test_mode == false, 'Invalid test mode');

    let erc20_token = store.get_token(contracts.erc20.contract_address);
    assert(erc20_token.address == contracts.erc20.contract_address, 'Invalid erc20 token address');
    assert(erc20_token.name == "Test ERC20", 'Invalid erc20 token name');
    assert(erc20_token.symbol == "T20", 'Invalid erc20 token symbol');
    assert(erc20_token.token_type == TokenType::erc20, 'Invalid erc20 token type');
    assert(erc20_token.is_registered == true, 'Invalid erc20 token registered');

    let erc721_token = store.get_token(contracts.erc721.contract_address);
    assert(
        erc721_token.address == contracts.erc721.contract_address, 'Invalid erc721 token address',
    );
    assert(erc721_token.name == "Test ERC721", 'Invalid erc721 token name');
    assert(erc721_token.symbol == "T721", 'Invalid erc721 token symbol');
    assert(erc721_token.token_type == TokenType::erc721, 'Invalid erc721 token type');
    assert(erc721_token.is_registered == true, 'Invalid erc721 token registered');
}

//
// Test creating tournaments
//

#[test]
fn create_tournament() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
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
    assert!(
        tournament.entry_requirement == Option::None, "tournament entry requirement should be none",
    );
    assert!(tournament.entry_fee == Option::None, "tournament entry fee should be none");
    assert(
        tournament.game_config.address == contracts.minigame.contract_address,
        'Invalid game address',
    );
    assert(tournament.game_config.settings_id == 1, 'Invalid settings id');
    assert(contracts.budokan.total_tournaments() == 1, 'Invalid tournaments count');
}

#[test]
fn create_tournament_start_time_in_past() {
    let contracts = setup();

    let time = 100;

    testing::set_block_timestamp(time);

    // try to create a tournament with the tournament start time in the past
    let game_period = Period { start: time - 10, end: time + MIN_TOURNAMENT_LENGTH.into() };

    let schedule = custom_schedule(Option::None, game_period, MIN_SUBMISSION_PERIOD.into());

    contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            Option::None,
            Option::None,
        );
}

#[test]
#[should_panic(
    expected: ("Schedule: Registration period less than minimum of 900", 'ENTRYPOINT_FAILED'),
)]
fn create_tournament_registration_period_too_short() {
    let contracts = setup();

    let schedule = custom_schedule(
        Option::Some(registration_period_too_short()),
        test_game_period(),
        MIN_SUBMISSION_PERIOD.into(),
    );

    let entry_requirement = Option::None;
    let entry_fee = Option::None;

    contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );
}

#[test]
#[should_panic(
    expected: (
        "Schedule: Registration period greater than maximum of 2592000", 'ENTRYPOINT_FAILED',
    ),
)]
fn create_tournament_registration_period_too_long() {
    let contracts = setup();

    let schedule = custom_schedule(
        Option::Some(registration_period_too_long()),
        test_game_period(),
        MIN_SUBMISSION_PERIOD.into(),
    );
    let entry_requirement = Option::None;
    let entry_fee = Option::None;

    contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );
}

#[test]
#[should_panic(
    expected: (
        "Schedule: Registration end time 1802 is after tournament end time 1801",
        'ENTRYPOINT_FAILED',
    ),
)]
fn create_tournament_end_time_too_close() {
    let contracts = setup();

    let schedule = registration_open_beyond_tournament_end();

    let entry_requirement = Option::None;
    let entry_fee = Option::None;

    contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );
}

#[test]
#[should_panic(
    expected: (
        "Schedule: Tournament duration greater than maximum of 31104000", 'ENTRYPOINT_FAILED',
    ),
)]
fn create_tournament_tournament_too_long() {
    let contracts = setup();

    let schedule = tournament_too_long();

    contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            Option::None,
            Option::None,
        );
}

#[test]
#[should_panic(
    expected: ("Schedule: Submission duration must be between 900 and 604800", 'ENTRYPOINT_FAILED'),
)]
fn create_tournament_submission_period_too_short() {
    let contracts = setup();

    let schedule = custom_schedule(
        Option::None, test_game_period(), MIN_SUBMISSION_PERIOD.into() - 1,
    );

    contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            Option::None,
            Option::None,
        );
}

#[test]
#[should_panic(
    expected: ("Schedule: Submission duration must be between 900 and 604800", 'ENTRYPOINT_FAILED'),
)]
fn create_tournament_submission_period_too_long() {
    let contracts = setup();

    let schedule = custom_schedule(
        Option::None, test_game_period(), MAX_SUBMISSION_PERIOD.into() + 1,
    );

    contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            Option::None,
            Option::None,
        );
}

#[test]
fn create_tournament_with_prizes() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );
    contracts.erc20.approve(contracts.budokan.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.budokan.contract_address, 1);
    contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            1,
        );
    contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc721.contract_address,
            TokenTypeData::erc721(ERC721Data { id: 1 }),
            1,
        );
    assert(contracts.erc20.balance_of(OWNER()) == 0, 'Invalid balance');
    assert(contracts.erc721.balance_of(OWNER()) == 0, 'Invalid balance');
}

// #[test]
// #[should_panic(expected: ('prize token not registered', 'ENTRYPOINT_FAILED'))]
// fn create_tournament_with_prizes_token_not_registered() {
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
fn create_tournament_with_prizes_position_too_large() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    contracts.erc20.approve(contracts.budokan.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.budokan.contract_address, 1);
    contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            2,
        );
    contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc721.contract_address,
            TokenTypeData::erc721(ERC721Data { id: 1 }),
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
fn create_tournament_with_premiums_too_long() {
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

    let entry_fee = Option::Some(entry_fee);
    let entry_requirement = Option::None;

    contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Entry fee distribution needs to be 100%. Distribution: 95%",
        'ENTRYPOINT_FAILED',
    ),
)]
fn create_tournament_with_premiums_not_100() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let entry_fee = EntryFee {
        token_address: contracts.erc20.contract_address,
        amount: 1,
        distribution: array![90, 5].span(),
        tournament_creator_share: Option::None,
        game_creator_share: Option::None,
    };
    let entry_fee = Option::Some(entry_fee);
    let entry_requirement = Option::None;

    let mut game_config = test_game_config(contracts.minigame.contract_address);
    game_config.prize_spots = 2;

    contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, entry_fee, entry_requirement,
        );
}

#[test]
fn create_gated_tournament_with_unsettled_tournament() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create first tournament
    let first_tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    // Move to tournament start time
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter first tournament
    contracts.budokan.enter_tournament(first_tournament.id, "test_player", OWNER(), Option::None);

    let entry_requirement_type = EntryRequirementType::tournament(
        TournamentType::winners(array![first_tournament.id].span()),
    );

    let entry_requirement = EntryRequirement { entry_limit: 0, entry_requirement_type };

    let entry_fee = Option::None;
    let entry_requirement = Option::Some(entry_requirement);

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

    contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );
}

#[test]
fn create_tournament_gated_by_multiple_tournaments() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create first tournament
    let first_tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    // Create second tournament
    let second_tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter and complete first tournament
    let (first_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(first_tournament.id, "test_player1", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.minigame.end_game(first_entry_token_id, 10);
    contracts.budokan.submit_score(first_tournament.id, first_entry_token_id, 1);

    // Enter and complete second tournament
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());
    let (second_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(second_tournament.id, "test_player2", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.minigame.end_game(second_entry_token_id, 20);
    contracts.budokan.submit_score(second_tournament.id, second_entry_token_id, 1);

    // Settle tournaments
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // Create tournament gated by both previous tournaments
    let entry_requirement_type = EntryRequirementType::tournament(
        TournamentType::winners(array![first_tournament.id, second_tournament.id].span()),
    );

    let entry_requirement = EntryRequirement { entry_limit: 1, entry_requirement_type };

    let entry_fee = Option::None;
    let entry_requirement = Option::Some(entry_requirement);

    let current_time = get_block_timestamp();

    let schedule = Schedule {
        registration: Option::Some(
            Period { start: current_time, end: current_time + MIN_REGISTRATION_PERIOD.into() },
        ),
        game: Period {
            start: current_time + MIN_REGISTRATION_PERIOD.into(),
            end: current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
        },
        submission_duration: MIN_SUBMISSION_PERIOD.into(),
    };

    let gated_tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    assert(gated_tournament.entry_requirement == entry_requirement, 'Invalid entry requirement');

    testing::set_block_timestamp(current_time + MIN_REGISTRATION_PERIOD.into() - 1);

    let first_qualifying_token_id = Option::Some(
        QualificationProof::Tournament(
            TournamentQualification {
                tournament_id: first_tournament.id, token_id: first_entry_token_id, position: 1,
            },
        ),
    );
    let second_qualifying_token_id = Option::Some(
        QualificationProof::Tournament(
            TournamentQualification {
                tournament_id: second_tournament.id, token_id: second_entry_token_id, position: 1,
            },
        ),
    );
    // This should succeed since we completed both required tournaments
    contracts
        .budokan
        .enter_tournament(gated_tournament.id, "test_player3", OWNER(), first_qualifying_token_id);
    contracts
        .budokan
        .enter_tournament(gated_tournament.id, "test_player4", OWNER(), second_qualifying_token_id);

    // Verify entry was successful
    let entries = contracts.budokan.tournament_entries(gated_tournament.id);
    assert(entries == 2, 'Invalid entry count');
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Maximum qualified entries reached for tournament 3", 'ENTRYPOINT_FAILED',
    ),
)]
fn create_tournament_gated_by_multiple_tournaments_with_limited_entry() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create first tournament
    let first_tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    // Create second tournament
    let second_tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter and complete first tournament
    let (first_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(first_tournament.id, "test_player1", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.minigame.end_game(first_entry_token_id, 10);
    contracts.budokan.submit_score(first_tournament.id, first_entry_token_id, 1);

    // Enter and complete second tournament
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());
    let (second_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(second_tournament.id, "test_player2", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.minigame.end_game(second_entry_token_id, 20);
    contracts.budokan.submit_score(second_tournament.id, second_entry_token_id, 1);

    // Settle tournaments
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // Create tournament gated by both previous tournaments
    let entry_requirement_type = EntryRequirementType::tournament(
        TournamentType::winners(array![first_tournament.id, second_tournament.id].span()),
    );

    let entry_requirement = EntryRequirement { entry_limit: 1, entry_requirement_type };

    let entry_fee = Option::None;
    let entry_requirement = Option::Some(entry_requirement);

    let current_time = get_block_timestamp();

    let schedule = Schedule {
        registration: Option::Some(
            Period { start: current_time, end: current_time + MIN_REGISTRATION_PERIOD.into() },
        ),
        game: Period {
            start: current_time + MIN_REGISTRATION_PERIOD.into(),
            end: current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
        },
        submission_duration: MIN_SUBMISSION_PERIOD.into(),
    };

    let gated_tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    assert(gated_tournament.entry_requirement == entry_requirement, 'Invalid entry requirement');

    testing::set_block_timestamp(current_time + MIN_REGISTRATION_PERIOD.into() - 1);

    let first_qualifying_token_id = Option::Some(
        QualificationProof::Tournament(
            TournamentQualification {
                tournament_id: first_tournament.id, token_id: first_entry_token_id, position: 1,
            },
        ),
    );
    let second_qualifying_token_id = Option::Some(
        QualificationProof::Tournament(
            TournamentQualification {
                tournament_id: second_tournament.id, token_id: second_entry_token_id, position: 1,
            },
        ),
    );
    // This should succeed since we completed both required tournaments
    contracts
        .budokan
        .enter_tournament(gated_tournament.id, "test_player3", OWNER(), first_qualifying_token_id);
    contracts
        .budokan
        .enter_tournament(gated_tournament.id, "test_player4", OWNER(), second_qualifying_token_id);
    // this is the failing case, should only be able to enter once with the same qualification proof
    contracts
        .budokan
        .enter_tournament(gated_tournament.id, "test_player5", OWNER(), second_qualifying_token_id);
}

#[test]
fn allowlist_gated_tournament() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create array of allowed accounts
    let allowed_player1 = starknet::contract_address_const::<0x456>();
    let allowed_player2 = starknet::contract_address_const::<0x789>();
    let allowed_accounts = array![OWNER(), allowed_player1, allowed_player2].span();

    // Create tournament gated by account list
    let entry_requirement_type = EntryRequirementType::allowlist(allowed_accounts);

    let entry_requirement = EntryRequirement { entry_limit: 1, entry_requirement_type };

    let entry_fee = Option::None;
    let entry_requirement = Option::Some(entry_requirement);

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    // Verify tournament was created with correct gating
    assert(tournament.entry_requirement == entry_requirement, 'Invalid entry requirement');

    // Start tournament entries
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Allowed account (owner) can enter
    let player1_qualification = Option::Some(QualificationProof::Address(OWNER()));
    contracts
        .budokan
        .enter_tournament(tournament.id, "test_player1", OWNER(), player1_qualification);

    // Allowed player can enter
    utils::impersonate(allowed_player1);
    let player2_qualification = Option::Some(QualificationProof::Address(allowed_player1));
    contracts
        .budokan
        .enter_tournament(tournament.id, "test_player2", allowed_player1, player2_qualification);

    // Verify entries were successful
    let entries = contracts.budokan.tournament_entries(tournament.id);
    assert(entries == 2, 'Invalid entry count');
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Maximum qualified entries reached for tournament 1", 'ENTRYPOINT_FAILED',
    ),
)]
fn allowlist_gated_tournament_with_entry_limit() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create array of allowed accounts
    let allowed_player2 = starknet::contract_address_const::<0x456>();
    let allowed_accounts = array![OWNER(), allowed_player2].span();

    // Create tournament gated by account list
    let entry_requirement_type = EntryRequirementType::allowlist(allowed_accounts);

    let entry_requirement = EntryRequirement { entry_limit: 1, entry_requirement_type };

    let entry_fee = Option::None;
    let entry_requirement = Option::Some(entry_requirement);

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    // Verify tournament was created with correct gating
    assert(tournament.entry_requirement == entry_requirement, 'Invalid entry requirement');

    // Start tournament entries
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Allowed account (owner) can enter
    let player1_qualification = Option::Some(QualificationProof::Address(OWNER()));
    contracts
        .budokan
        .enter_tournament(tournament.id, "test_player1", OWNER(), player1_qualification);

    // Allowed player can enter
    utils::impersonate(allowed_player2);
    let player2_qualification = Option::Some(QualificationProof::Address(allowed_player2));
    contracts
        .budokan
        .enter_tournament(tournament.id, "test_player2", allowed_player2, player2_qualification);
    // this should fail because we have an entry limit of 1
    contracts
        .budokan
        .enter_tournament(tournament.id, "test_player3", allowed_player2, player2_qualification);
}

#[test]
#[should_panic(
    expected: ("Tournament: Qualifying address is not in allowlist", 'ENTRYPOINT_FAILED'),
)]
fn allowlist_gated_tournament_unauthorized() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create array of allowed accounts (not including player2)
    let allowed_player = starknet::contract_address_const::<0x456>();
    let allowed_accounts = array![OWNER(), allowed_player].span();

    // Create tournament gated by account list
    let entry_requirement_type = EntryRequirementType::allowlist(allowed_accounts);
    let entry_requirement = EntryRequirement { entry_limit: 1, entry_requirement_type };
    let entry_requirement = Option::Some(entry_requirement);

    let entry_fee = Option::None;

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    // Start tournament entries
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Try to enter with unauthorized account
    let unauthorized_player = starknet::contract_address_const::<0x789>();
    utils::impersonate(unauthorized_player);
    let unauthorized_player_qualification = Option::Some(
        QualificationProof::Address(unauthorized_player),
    );
    // This should panic since unauthorized_player is not in the allowed accounts list
    contracts
        .budokan
        .enter_tournament(
            tournament.id,
            "test_player_unauthorized",
            unauthorized_player,
            unauthorized_player_qualification,
        );
}

// this is allowed but we need to verify the game token is minted to the qualified address
// and not the caller address
#[test]
fn allowlist_gated_caller_different_from_qualification_address() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Only player1 is allowed to enter
    let allowed_player = starknet::contract_address_const::<0x456>();
    let allowed_accounts = array![allowed_player].span();

    // Create tournament gated by account list
    let entry_requirement_type = EntryRequirementType::allowlist(allowed_accounts);

    let entry_requirement = EntryRequirement { entry_limit: 1, entry_requirement_type };

    let entry_fee = Option::None;
    let entry_requirement = Option::Some(entry_requirement);

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    // Verify tournament was created with correct gating
    assert(tournament.entry_requirement == entry_requirement, 'Invalid entry requirement');

    // Start tournament entries
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Owner tries to enter tournament using player1s address
    // should panic
    let player1_qualification = Option::Some(QualificationProof::Address(allowed_player));
    contracts
        .budokan
        .enter_tournament(tournament.id, "test_player1", OWNER(), player1_qualification);
}

#[test]
fn create_tournament_season() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let schedule = Schedule {
        registration: Option::None,
        game: Period { start: TEST_START_TIME().into(), end: TEST_END_TIME().into() },
        submission_duration: MIN_SUBMISSION_PERIOD.into(),
    };

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            Option::None,
            Option::None,
        );

    // verify tournament was created with correct schedule
    assert(tournament.schedule == schedule, 'Invalid tournament schedule');
}

// //
// // Test registering tokens
// //

// // #[test]
// // fn register_token() {
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
// // fn register_token_already_registered() {
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
fn enter_tournament() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    // advance time to registration start time
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // enter tournament
    let (game_token_id, entry_number) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player", OWNER(), Option::None);

    // verify registration information
    let player1_registration = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, game_token_id);

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
    expected: (
        "Tournament: Provided Token ID 1 does not match Token ID 1 at leaderboard position 1 for tournament 1",
        'ENTRYPOINT_FAILED',
    ),
)]
fn use_host_token_to_qualify_into_tournament_gated_tournament() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // First create and complete a tournament that will be used as a gate
    let first_tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Complete the first tournament
    let (first_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(first_tournament.id, "test_player", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.minigame.end_game(first_entry_token_id, 100);
    contracts.budokan.submit_score(first_tournament.id, first_entry_token_id, 1);

    // Settle first tournament
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // assert first_entry_token_id is in the leaderboard
    let leaderboard = contracts.budokan.get_leaderboard(first_tournament.id);
    let first_place = *leaderboard.at(0);
    assert!(
        first_place == first_entry_token_id,
        "Invalid first place for first tournament. Expected: {}, got: {}",
        first_place,
        first_entry_token_id,
    );

    // Create a tournament gated by the previous tournament
    let entry_requirement_type = EntryRequirementType::tournament(
        TournamentType::winners(array![first_tournament.id].span()),
    );
    let entry_requirement = EntryRequirement { entry_limit: 0, entry_requirement_type };
    let entry_requirement = Option::Some(entry_requirement);

    let entry_fee = Option::None;

    let current_time = get_block_timestamp();

    let schedule = Schedule {
        registration: Option::Some(
            Period { start: current_time, end: current_time + MIN_REGISTRATION_PERIOD.into() },
        ),
        game: Period {
            start: current_time + MIN_REGISTRATION_PERIOD.into(),
            end: current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
        },
        submission_duration: MIN_SUBMISSION_PERIOD.into(),
    };

    let second_tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    // attempt to join second tournament using the host token, should panic
    let wrong_submission_type = Option::Some(
        QualificationProof::Tournament(
            TournamentQualification {
                tournament_id: first_tournament.id,
                token_id: first_tournament.creator_token_id,
                position: 1,
            },
        ),
    );
    contracts
        .budokan
        .enter_tournament(second_tournament.id, "test_player", OWNER(), wrong_submission_type);
}


#[test]
#[should_panic(
    expected: (
        "Tournament: Provided Token ID 3 does not match Token ID 3 at leaderboard position 1 for tournament 1",
        'ENTRYPOINT_FAILED',
    ),
)]
fn enter_tournament_wrong_submission_type() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // First create and complete a tournament that will be used as a gate
    let first_tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Complete the first tournament
    let (first_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(first_tournament.id, "test_player", OWNER(), Option::None);

    let (second_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(first_tournament.id, "test_player", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.minigame.end_game(first_entry_token_id, 100);
    contracts.minigame.end_game(second_entry_token_id, 10);
    contracts.budokan.submit_score(first_tournament.id, first_entry_token_id, 1);

    // Settle first tournament
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // assert first_entry_token_id is in the leaderboard
    let leaderboard = contracts.budokan.get_leaderboard(first_tournament.id);
    let first_place = *leaderboard.at(0);
    assert!(
        first_place == first_entry_token_id,
        "Invalid first place for first tournament. Expected: {}, got: {}",
        first_place,
        first_entry_token_id,
    );

    // Create a tournament gated by the previous tournament
    let entry_requirement_type = EntryRequirementType::tournament(
        TournamentType::winners(array![first_tournament.id].span()),
    );
    let entry_requirement = EntryRequirement { entry_limit: 0, entry_requirement_type };
    let entry_requirement = Option::Some(entry_requirement);

    let entry_fee = Option::None;

    let current_time = get_block_timestamp();

    let schedule = Schedule {
        registration: Option::Some(
            Period { start: current_time, end: current_time + MIN_REGISTRATION_PERIOD.into() },
        ),
        game: Period {
            start: current_time + MIN_REGISTRATION_PERIOD.into(),
            end: current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
        },
        submission_duration: MIN_SUBMISSION_PERIOD.into(),
    };

    let second_tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    // attempt to join second tournament using token that did not win first tournament, should panic
    let wrong_submission_type = Option::Some(
        QualificationProof::Tournament(
            TournamentQualification {
                tournament_id: first_tournament.id, token_id: second_entry_token_id, position: 1,
            },
        ),
    );
    contracts
        .budokan
        .enter_tournament(second_tournament.id, "test_player", OWNER(), wrong_submission_type);
}

#[test]
fn enter_tournament_season() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let schedule = test_season_schedule();

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            Option::None,
            Option::None,
        );

    testing::set_block_timestamp(TEST_START_TIME().into());

    let (game_token_id, entry_number) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player", OWNER(), Option::None);

    assert!(entry_number == 1, "Invalid entry number");

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.minigame.end_game(game_token_id, 10);
    contracts.budokan.submit_score(tournament.id, game_token_id, 1);

    // verify finished first
    let winners = contracts.budokan.get_leaderboard(tournament.id);
    assert(winners.len() == 1, 'Invalid number of winners');
    assert(*winners.at(0) == game_token_id, 'Invalid winner');
}

//
// Test submitting scores
//

#[test]
fn submit_score_gas_check() {
    let contracts = setup();
    utils::impersonate(OWNER());

    // Create tournament with leaderboard of 10
    let mut game_config = test_game_config(contracts.minigame.contract_address);
    game_config.prize_spots = 10;
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, Option::None, Option::None,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter 10 players into the tournament
    let (player1, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player", OWNER(), Option::None);

    let (player2, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player2", OWNER(), Option::None);

    let (player3, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player3", OWNER(), Option::None);

    let (player4, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player4", OWNER(), Option::None);

    let (player5, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player5", OWNER(), Option::None);

    let (player6, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player6", OWNER(), Option::None);

    let (player7, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player7", OWNER(), Option::None);

    let (player8, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player8", OWNER(), Option::None);

    let (player9, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player9", OWNER(), Option::None);

    let (player10, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player10", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    // Set scores for each player
    contracts.minigame.end_game(player1, 100);
    contracts.minigame.end_game(player2, 90);
    contracts.minigame.end_game(player3, 80);
    contracts.minigame.end_game(player4, 70);
    contracts.minigame.end_game(player5, 60);
    contracts.minigame.end_game(player6, 50);
    contracts.minigame.end_game(player7, 40);
    contracts.minigame.end_game(player8, 30);
    contracts.minigame.end_game(player9, 20);
    contracts.minigame.end_game(player10, 10);

    // Submit scores for each player
    contracts.budokan.submit_score(tournament.id, player1, 1);
    contracts.budokan.submit_score(tournament.id, player2, 2);
    contracts.budokan.submit_score(tournament.id, player3, 3);
    contracts.budokan.submit_score(tournament.id, player4, 4);
    contracts.budokan.submit_score(tournament.id, player5, 5);
    contracts.budokan.submit_score(tournament.id, player6, 6);
    contracts.budokan.submit_score(tournament.id, player7, 7);
    contracts.budokan.submit_score(tournament.id, player8, 8);
    contracts.budokan.submit_score(tournament.id, player9, 9);
    contracts.budokan.submit_score(tournament.id, player10, 10);

    // Roll forward to beyond submission period
    testing::set_block_timestamp(TEST_END_TIME().into() + MIN_SUBMISSION_PERIOD.into() + 1);

    // verify tournament is finalized
    let state = contracts.budokan.current_phase(tournament.id);
    assert!(state == Phase::Finalized, "Tournament should be finalized");

    // Verify final leaderboard
    let leaderboard = contracts.budokan.get_leaderboard(tournament.id);
    assert!(leaderboard.len() == 10, "Invalid leaderboard length");
    assert!(
        *leaderboard.at(0) == player1,
        "Invalid first place. Expected: {}, got: {}",
        player1,
        *leaderboard.at(0),
    );
    assert!(
        *leaderboard.at(1) == player2,
        "Invalid second place. Expected: {}, got: {}",
        player2,
        *leaderboard.at(1),
    );
    assert!(
        *leaderboard.at(2) == player3,
        "Invalid third place. Expected: {}, got: {}",
        player3,
        *leaderboard.at(2),
    );
    assert!(
        *leaderboard.at(3) == player4,
        "Invalid fourth place. Expected: {}, got: {}",
        player4,
        *leaderboard.at(3),
    );
    assert!(
        *leaderboard.at(4) == player5,
        "Invalid fifth place. Expected: {}, got: {}",
        player5,
        *leaderboard.at(4),
    );
    assert!(
        *leaderboard.at(5) == player6,
        "Invalid sixth place. Expected: {}, got: {}",
        player6,
        *leaderboard.at(5),
    );
    assert!(
        *leaderboard.at(6) == player7,
        "Invalid seventh place. Expected: {}, got: {}",
        player7,
        *leaderboard.at(6),
    );
    assert!(
        *leaderboard.at(7) == player8,
        "Invalid eighth place. Expected: {}, got: {}",
        player8,
        *leaderboard.at(7),
    );
    assert!(
        *leaderboard.at(8) == player9,
        "Invalid ninth place. Expected: {}, got: {}",
        player9,
        *leaderboard.at(8),
    );
    assert!(
        *leaderboard.at(9) == player10,
        "Invalid tenth place. Expected: {}, got: {}",
        player10,
        *leaderboard.at(9),
    );
}

#[test]
fn submit_score_basic() {
    let contracts = setup();
    utils::impersonate(OWNER());

    // Create tournament with 10 prize spots
    let mut game_config = test_game_config(contracts.minigame.contract_address);
    game_config.prize_spots = 10;
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, Option::None, Option::None,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter tournament
    let (token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.minigame.end_game(token_id, 100);

    // Submit score for first place (position 1)
    contracts.budokan.submit_score(tournament.id, token_id, 1);

    // Verify leaderboard
    let leaderboard = contracts.budokan.get_leaderboard(tournament.id);
    assert!(leaderboard.len() == 1, "Invalid leaderboard length");
    assert!(*leaderboard.at(0) == token_id, "Invalid token id in leaderboard");
}

#[test]
fn submit_score_multiple_positions() {
    let contracts = setup();
    utils::impersonate(OWNER());

    // Create tournament with 3 prize spots
    let mut game_config = test_game_config(contracts.minigame.contract_address);
    game_config.prize_spots = 4;
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, Option::None, Option::None,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter tournament with three players
    let (token_id1, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);
    let (token_id2, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player2", OWNER(), Option::None);
    let (token_id3, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player3", OWNER(), Option::None);
    let (token_id4, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player4", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    // Set different scores
    contracts.minigame.end_game(token_id1, 100);
    contracts.minigame.end_game(token_id2, 50);
    contracts.minigame.end_game(token_id3, 75);
    contracts.minigame.end_game(token_id4, 1);

    // Submit scores in different order than final ranking
    contracts.budokan.submit_score(tournament.id, token_id3, 1); // 75 points
    contracts.budokan.submit_score(tournament.id, token_id1, 1); // 100 points
    contracts.budokan.submit_score(tournament.id, token_id2, 3); // 50 points
    contracts.budokan.submit_score(tournament.id, token_id4, 4); // 25 points

    // Verify leaderboard
    let leaderboard = contracts.budokan.get_leaderboard(tournament.id);
    assert!(leaderboard.len() == 4, "Invalid leaderboard length");
    assert!(*leaderboard.at(0) == token_id1, "Invalid first place");
    assert!(*leaderboard.at(1) == token_id3, "Invalid second place");
    assert!(*leaderboard.at(2) == token_id2, "Invalid third place");
    assert!(*leaderboard.at(3) == token_id4, "Invalid fourth place");
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Score 50 is less than current score of 100 at position 1", 'ENTRYPOINT_FAILED',
    ),
)]
fn submit_score_lower_score() {
    let contracts = setup();
    utils::impersonate(OWNER());

    let mut game_config = test_game_config(contracts.minigame.contract_address);
    game_config.prize_spots = 3;
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, Option::None, Option::None,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (token_id1, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);
    let (token_id2, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player2", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.minigame.end_game(token_id1, 100);
    contracts.minigame.end_game(token_id2, 50);

    // Submit higher score first
    contracts.budokan.submit_score(tournament.id, token_id1, 1);

    // Try to submit lower score for same position
    contracts.budokan.submit_score(tournament.id, token_id2, 1);
}


#[test]
#[should_panic(expected: ("Tournament: Invalid position", 'ENTRYPOINT_FAILED'))]
fn submit_score_invalid_position() {
    let contracts = setup();
    utils::impersonate(OWNER());

    let mut game_config = test_game_config(contracts.minigame.contract_address);
    game_config.prize_spots = 2;
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, Option::None, Option::None,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());
    let (token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.minigame.end_game(token_id, 100);

    // Try to submit for position 3 when only 2 prize spots exist
    contracts.budokan.submit_score(tournament.id, token_id, 3);
}

#[test]
#[should_panic(expected: ("Tournament: Score already submitted", 'ENTRYPOINT_FAILED'))]
fn submit_score_already_submitted() {
    let contracts = setup();
    utils::impersonate(OWNER());

    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());
    let (token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.minigame.end_game(token_id, 100);

    // Submit score once
    contracts.budokan.submit_score(tournament.id, token_id, 1);

    // Try to submit again
    contracts.budokan.submit_score(tournament.id, token_id, 1);
}

#[test]
#[should_panic(expected: ("Tournament: Not in submission period", 'ENTRYPOINT_FAILED'))]
fn submit_score_wrong_period() {
    let contracts = setup();
    utils::impersonate(OWNER());

    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());
    let (token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);

    // Try to submit before tournament ends
    testing::set_block_timestamp(TEST_START_TIME().into());
    contracts.minigame.end_game(token_id, 100);
    contracts.budokan.submit_score(tournament.id, token_id, 1);
}

#[test]
#[should_panic(expected: ("Tournament: Invalid position", 'ENTRYPOINT_FAILED'))]
fn submit_score_position_zero() {
    let contracts = setup();
    utils::impersonate(OWNER());

    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());
    let (token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.minigame.end_game(token_id, 100);

    // Try to submit for position 0
    contracts.budokan.submit_score(tournament.id, token_id, 0);
}

#[test]
#[should_panic(
    expected: ("Tournament: Must submit for next available position", 'ENTRYPOINT_FAILED'),
)]
fn submit_score_with_gap() {
    let contracts = setup();
    utils::impersonate(OWNER());

    let mut game_config = test_game_config(contracts.minigame.contract_address);
    game_config.prize_spots = 3;
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, Option::None, Option::None,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());
    let (token_id1, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);
    let (token_id2, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player2", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.minigame.end_game(token_id1, 100);
    contracts.minigame.end_game(token_id2, 75);

    // Submit to position 1 first
    contracts.budokan.submit_score(tournament.id, token_id1, 1);
    // Submit to position 3, leaving position 2 empty
    contracts.budokan.submit_score(tournament.id, token_id2, 3);

    let leaderboard = contracts.budokan.get_leaderboard(tournament.id);
    assert!(leaderboard.len() == 2, "Invalid leaderboard length");
    assert!(*leaderboard.at(0) == token_id1, "Invalid first place");
    assert!(*leaderboard.at(1) == token_id2, "Invalid second place");
}

#[test]
#[should_panic(expected: ("Tournament: Tournament 2 does not exist", 'ENTRYPOINT_FAILED'))]
fn submit_score_invalid_tournament() {
    let contracts = setup();
    utils::impersonate(OWNER());

    // create basic tournament
    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    // Try to submit score for non-existent tournament
    let tournament_id = tournament.id + 1;
    let token_id = 1;
    let position = 1;
    contracts.budokan.submit_score(tournament_id, token_id, position);
}

//
// Test distributing rewards
//

#[test]
fn claim_prizes_with_sponsored_prizes() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    // register_tokens_for_test(tournament, erc20, erc721);

    contracts.erc20.approve(contracts.budokan.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.budokan.contract_address, 1);
    let first_prize_id = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            1,
        );
    let second_prize_id = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc721.contract_address,
            TokenTypeData::erc721(ERC721Data { id: 1 }),
            1,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.minigame.end_game(1, 1);

    contracts.budokan.submit_score(tournament.id, entry_token_id, 1);

    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(first_prize_id));
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(second_prize_id));

    // check balances of owner after claiming prizes
    assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE, 'Invalid balance');
    assert(contracts.erc721.owner_of(1) == OWNER(), 'Invalid owner');
}

#[test]
#[should_panic(expected: ("Tournament: Prize has already been claimed", 'ENTRYPOINT_FAILED'))]
fn claim_prizes_prize_already_claimed() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    contracts.erc20.approve(contracts.budokan.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.budokan.contract_address, 1);
    let first_prize_id = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            1,
        );

    contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc721.contract_address,
            TokenTypeData::erc721(ERC721Data { id: 1 }),
            1,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.minigame.end_game(1, 1);

    contracts.budokan.submit_score(tournament.id, entry_token_id, 1);

    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(first_prize_id));
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(first_prize_id));
}

#[test]
fn claim_prizes_with_gated_tokens_criteria() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let entry_requirement_type = EntryRequirementType::token(contracts.erc721.contract_address);
    let entry_requirement = EntryRequirement { entry_limit: 1, entry_requirement_type };
    let entry_requirement = Option::Some(entry_requirement);

    let entry_fee = Option::None;

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    assert(tournament.entry_fee == entry_fee, 'Invalid entry fee');

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let qualification = Option::Some(QualificationProof::NFT(NFTQualification { token_id: 1 }));

    let (entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player", OWNER(), qualification);

    testing::set_block_timestamp(TEST_START_TIME().into());

    // check tournament entries
    assert(contracts.budokan.tournament_entries(tournament.id) == 1, 'Invalid entries');

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.minigame.end_game(entry_token_id, 1);

    contracts.budokan.submit_score(tournament.id, entry_token_id, 1);
}

#[test]
fn claim_prizes_with_gated_tokens_uniform() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let entry_requirement_type = EntryRequirementType::token(contracts.erc721.contract_address);
    let entry_requirement = EntryRequirement { entry_limit: 1, entry_requirement_type };
    let entry_requirement = Option::Some(entry_requirement);

    let entry_fee = Option::None;

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    assert(tournament.entry_requirement == entry_requirement, 'Invalid entry requirement');

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let qualification = Option::Some(QualificationProof::NFT(NFTQualification { token_id: 1 }));

    let (entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player", OWNER(), qualification);

    // check tournament entries
    assert(contracts.budokan.tournament_entries(tournament.id) == 1, 'Invalid entries');

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.minigame.end_game(entry_token_id, 1);

    contracts.budokan.submit_score(tournament.id, entry_token_id, 1);
}

#[test]
fn claim_prizes_with_gated_tournaments() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let first_tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .budokan
        .enter_tournament(first_tournament.id, "test_player1", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.minigame.end_game(entry_token_id, 1);

    contracts.budokan.submit_score(first_tournament.id, entry_token_id, 1);

    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // verify entry token id won the first tournament
    let leaderboard = contracts.budokan.get_leaderboard(first_tournament.id);
    assert!(
        *leaderboard.at(0) == entry_token_id,
        "Wrong leaderboard for first tournament. Expected: {}, got: {}",
        entry_token_id,
        *leaderboard.at(0),
    );

    // create a new tournament that is restricted to winners of the first tournament
    let entry_requirement_type = EntryRequirementType::tournament(
        TournamentType::winners(array![first_tournament.id].span()),
    );
    let entry_requirement = EntryRequirement { entry_limit: 1, entry_requirement_type };
    let entry_requirement = Option::Some(entry_requirement);

    let entry_fee = Option::None;

    let current_time = get_block_timestamp();

    let schedule = Schedule {
        registration: Option::Some(
            Period { start: current_time, end: current_time + MIN_REGISTRATION_PERIOD.into() },
        ),
        game: Period {
            start: current_time + MIN_REGISTRATION_PERIOD.into(),
            end: current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
        },
        submission_duration: MIN_SUBMISSION_PERIOD.into(),
    };

    let second_tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    assert(second_tournament.entry_fee == entry_fee, 'Invalid entry fee');
    assert(second_tournament.entry_requirement == entry_requirement, 'Invalid entry requirement');

    testing::set_block_timestamp(current_time);

    let qualification = Option::Some(
        QualificationProof::Tournament(
            TournamentQualification {
                tournament_id: first_tournament.id, token_id: entry_token_id, position: 1,
            },
        ),
    );

    let (second_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(second_tournament.id, "test_player2", OWNER(), qualification);

    testing::set_block_timestamp(
        current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
    );

    contracts.minigame.end_game(second_entry_token_id, 1);

    contracts.budokan.submit_score(second_tournament.id, second_entry_token_id, 1);
}

#[test]
fn claim_prizes_with_premiums() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let entry_fee = Option::Some(
        EntryFee {
            token_address: contracts.erc20.contract_address,
            amount: 1,
            distribution: array![100].span(),
            tournament_creator_share: Option::None,
            game_creator_share: Option::None,
        },
    );

    let entry_requirement = Option::None;

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    assert(tournament.entry_fee == entry_fee, 'Invalid entry fee');

    // handle approval for the premium
    contracts.erc20.approve(contracts.budokan.contract_address, 1);

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player", OWNER(), Option::None);

    // check owner now has 1 less premium token
    assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE - 1, 'Invalid balance');

    // check tournament now has premium funds
    assert(contracts.erc20.balance_of(contracts.budokan.contract_address) == 1, 'Invalid balance');

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.minigame.end_game(entry_token_id, 1);

    contracts.budokan.submit_score(tournament.id, entry_token_id, 1);

    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // claim entry fee prize for first place
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(1)));

    // check owner now has all premium funds back
    assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE, 'Invalid balance');
}

#[test]
fn claim_prizes_with_premium_creator_fee() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create entry fee with 10% creator fee and 90% to winner
    let entry_fee = Option::Some(
        EntryFee {
            token_address: contracts.erc20.contract_address,
            amount: 100, // 100 tokens per entry
            distribution: array![90].span(), // 90% to winner
            tournament_creator_share: Option::Some(10),
            game_creator_share: Option::None,
        },
    );

    let entry_requirement = Option::None;

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter tournament with two players
    utils::impersonate(OWNER());
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (first_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player1", OWNER(), Option::None);

    let player2 = starknet::contract_address_const::<0x456>();
    utils::impersonate(player2);
    contracts.erc20.mint(player2, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (player2_game_token, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player2", player2, Option::None);

    let creator_initial_balance = contracts.erc20.balance_of(OWNER());

    testing::set_block_timestamp(TEST_END_TIME().into());

    // Set scores (player2 wins)
    contracts.minigame.end_game(first_entry_token_id, 1);
    contracts.minigame.end_game(player2_game_token, 2);

    utils::impersonate(OWNER());

    contracts.budokan.submit_score(tournament.id, player2_game_token, 1);

    // Advance time to tournament submission period
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // Claim creator fee
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::TournamentCreator));

    // Verify creator fee distribution (10% of 200 total = 20)
    assert(
        contracts.erc20.balance_of(OWNER()) == creator_initial_balance + 20, 'Invalid creator fee',
    );

    // Check initial balances
    let winner_initial_balance = contracts.erc20.balance_of(player2);

    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(1)));

    // Verify winner prize distribution (90% of 200 total = 180)
    assert!(
        contracts.erc20.balance_of(player2) == winner_initial_balance + 180,
        "Invalid winner distribution, expected: {}, actual: {}",
        winner_initial_balance + 180,
        contracts.erc20.balance_of(player2),
    );
}


#[test]
fn claim_prizes_with_premium_game_fee() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create entry fee with 10% creator fee and 90% to winner
    let entry_fee = Option::Some(
        EntryFee {
            token_address: contracts.erc20.contract_address,
            amount: 100, // 100 tokens per entry
            distribution: array![90].span(), // 90% to winner
            tournament_creator_share: Option::None,
            game_creator_share: Option::Some(10),
        },
    );

    let entry_requirement = Option::None;

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            entry_fee,
            entry_requirement,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter tournament with two players
    utils::impersonate(OWNER());
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (first_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player1", OWNER(), Option::None);

    let player2 = starknet::contract_address_const::<0x456>();
    utils::impersonate(player2);
    contracts.erc20.mint(player2, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (player2_game_token, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player2", player2, Option::None);

    let minigame_registry_address = contracts.denshokan.game_registry_address();
    let minigame_registry_erc721_dispatcher = IERC721Dispatcher {
        contract_address: minigame_registry_address,
    };
    let game_creator = minigame_registry_erc721_dispatcher.owner_of(1);

    let creator_initial_balance = contracts.erc20.balance_of(game_creator);

    testing::set_block_timestamp(TEST_END_TIME().into());

    // Set scores (player2 wins)
    contracts.minigame.end_game(first_entry_token_id, 1);
    contracts.minigame.end_game(player2_game_token, 2);

    utils::impersonate(OWNER());

    contracts.budokan.submit_score(tournament.id, player2_game_token, 1);

    // Advance time to tournament submission period
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // Claim gsme creator fee
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::GameCreator));

    // Verify game creator fee distribution (10% of 200 total = 20)
    assert!(
        contracts.erc20.balance_of(game_creator) == creator_initial_balance + 20,
        "Invalid game creator fee",
    );

    // Check initial balances
    let winner_initial_balance = contracts.erc20.balance_of(player2);

    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(1)));

    // Verify winner prize distribution (90% of 200 total = 180)
    assert!(
        contracts.erc20.balance_of(player2) == winner_initial_balance + 180,
        "Invalid winner distribution, expected: {}, actual: {}",
        winner_initial_balance + 180,
        contracts.erc20.balance_of(player2),
    );
}

#[test]
fn claim_prizes_with_premium_multiple_winners() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create premium with 10% creator fee and split remaining 90% between top 3:
    // 1st: 50%, 2nd: 30%, 3rd: 20%
    let entry_fee = Option::Some(
        EntryFee {
            token_address: contracts.erc20.contract_address,
            amount: 100, // 100 tokens per entry
            distribution: array![50, 25, 15].span(), // Distribution percentages
            tournament_creator_share: Option::Some(10),
            game_creator_share: Option::None,
        },
    );

    let entry_requirement = Option::None;

    let mut game_config = test_game_config(contracts.minigame.contract_address);
    game_config.prize_spots = 3;

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, entry_fee, entry_requirement,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Create and enter with 4 players
    let player2 = starknet::contract_address_const::<0x456>();
    let player3 = starknet::contract_address_const::<0x789>();
    let player4 = starknet::contract_address_const::<0x101>();

    // Owner enters
    utils::impersonate(OWNER());
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (first_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player1", OWNER(), Option::None);

    // Player 2 enters
    utils::impersonate(player2);
    contracts.erc20.mint(player2, 200);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (second_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player2", player2, Option::None);

    // Player 3 enters
    utils::impersonate(player3);
    contracts.erc20.mint(player3, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (third_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player3", player3, Option::None);

    // Player 4 enters
    utils::impersonate(player4);
    contracts.erc20.mint(player4, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (fourth_entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player4", player4, Option::None);

    testing::set_block_timestamp(TEST_START_TIME().into());

    let third_initial = contracts.erc20.balance_of(OWNER());

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.minigame.end_game(second_entry_token_id, 100); // player2's game
    contracts.minigame.end_game(third_entry_token_id, 75); // player3's game
    contracts.minigame.end_game(first_entry_token_id, 50); // owner's game
    contracts.minigame.end_game(fourth_entry_token_id, 25); // player4's game

    // Submit scores
    utils::impersonate(player2);

    contracts.budokan.submit_score(tournament.id, second_entry_token_id, 1);
    contracts.budokan.submit_score(tournament.id, third_entry_token_id, 2);
    contracts.budokan.submit_score(tournament.id, first_entry_token_id, 3);

    // Store initial balances
    let first_initial = contracts.erc20.balance_of(player2);
    let second_initial = contracts.erc20.balance_of(player3);

    // Claim rewards
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
    // 3 premium prizes
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(1)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(2)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(3)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::TournamentCreator));

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

#[test]
fn claim_prizes_season() {
    let contracts = setup();

    utils::impersonate(OWNER());

    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    contracts.erc20.approve(contracts.budokan.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.budokan.contract_address, 1);
    let first_prize_id = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            1,
        );
    let second_prize_id = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc721.contract_address,
            TokenTypeData::erc721(ERC721Data { id: 1 }),
            1,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let (entry_token_id, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player1", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_START_TIME().into());

    contracts.minigame.end_game(entry_token_id, 1);

    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.budokan.submit_score(tournament.id, entry_token_id, 1);

    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(first_prize_id));
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(second_prize_id));

    // check balances of owner after claiming prizes
    assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE, 'Invalid balance');
    assert(contracts.erc721.owner_of(1) == OWNER(), 'Invalid owner');
}

#[test]
fn state_transitions() {
    let contracts = setup();
    utils::impersonate(OWNER());

    let registration_start_time = 1000;
    let registration_end_time = 10000;
    let tournament_start_time = 20000;
    let tournament_end_time = 30000;
    let submission_duration = 86400;

    let schedule = Schedule {
        registration: Option::Some(
            Period { start: registration_start_time, end: registration_end_time },
        ),
        game: Period { start: tournament_start_time, end: tournament_end_time },
        submission_duration: submission_duration,
    };

    // Create tournament
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            schedule,
            test_game_config(contracts.minigame.contract_address),
            Option::None,
            Option::None,
        );

    // Test Scheduled state (before registration)
    testing::set_block_timestamp(registration_start_time - 1);
    assert!(
        contracts.budokan.current_phase(tournament.id) == Phase::Scheduled,
        "Tournament should be in Scheduled state",
    );

    // Test Registration state
    testing::set_block_timestamp(registration_start_time);
    assert!(
        contracts.budokan.current_phase(tournament.id) == Phase::Registration,
        "Tournament should be in Registration state at start",
    );

    testing::set_block_timestamp(registration_end_time - 1);
    assert!(
        contracts.budokan.current_phase(tournament.id) == Phase::Registration,
        "Tournament should be in Registration state before end",
    );

    // Test Staging state (between registration end and tournament start)
    testing::set_block_timestamp(registration_end_time);
    assert!(
        contracts.budokan.current_phase(tournament.id) == Phase::Staging,
        "Tournament should be in Staging state after registration",
    );

    testing::set_block_timestamp(tournament_start_time - 1);
    assert!(
        contracts.budokan.current_phase(tournament.id) == Phase::Staging,
        "Tournament should be in Staging state before start",
    );

    // Test Live state
    testing::set_block_timestamp(tournament_start_time);
    assert!(
        contracts.budokan.current_phase(tournament.id) == Phase::Live,
        "Tournament should be in Live state at start",
    );

    testing::set_block_timestamp(tournament_end_time - 1);
    assert!(
        contracts.budokan.current_phase(tournament.id) == Phase::Live,
        "Tournament should be in Live state before end",
    );

    // Test Submission state
    testing::set_block_timestamp(tournament_end_time);
    assert!(
        contracts.budokan.current_phase(tournament.id) == Phase::Submission,
        "Tournament should be in Submission state after end",
    );

    // just before submission period ends
    testing::set_block_timestamp(tournament_end_time + submission_duration - 1);
    assert!(
        contracts.budokan.current_phase(tournament.id) == Phase::Submission,
        "Tournament should be in Submission state before submission period ends",
    );

    // Submission is over, so tournament should be finalized
    testing::set_block_timestamp(tournament_end_time + submission_duration);
    assert!(
        contracts.budokan.current_phase(tournament.id) == Phase::Finalized,
        "Tournament should be in Finalized state after submission period",
    );
}

#[test]
#[should_panic(
    expected: ("Tournament: Score 1000 qualifies for higher position than 3", 'ENTRYPOINT_FAILED'),
)]
fn malicious_score_submission() {
    let contracts = setup();
    utils::impersonate(OWNER());

    // Create tournament with 5 prize spots
    let mut game_config = test_game_config(contracts.minigame.contract_address);

    // Tournament has 3 prize spots
    game_config.prize_spots = 3;
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, Option::None, Option::None,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Five people enter the tournament
    let (first_place, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);

    let (second_place, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player2", OWNER(), Option::None);

    let (third_place, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player3", OWNER(), Option::None);

    let (fourth_place, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player4", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    // End games and set scores
    contracts.minigame.end_game(first_place, 1000);
    contracts.minigame.end_game(second_place, 800);
    contracts.minigame.end_game(third_place, 600);
    contracts.minigame.end_game(fourth_place, 400);

    // second place submits score first, as first which is valid
    contracts.budokan.submit_score(tournament.id, second_place, 1);

    // third place submits score second, as second which is valid
    contracts.budokan.submit_score(tournament.id, third_place, 2);

    // fourth place submits score third, as third which is valid
    contracts.budokan.submit_score(tournament.id, fourth_place, 3);

    // Someone then attempts to submit first place's score as third
    // This should fail because the contract will see that the score is more than the
    // position above it.
    contracts.budokan.submit_score(tournament.id, first_place, 3);
}

#[test]
#[should_panic(
    expected: (
        "Tournament: Tie goes to game with lower id. Submitted game id 3 is higher than current game id 2",
        'ENTRYPOINT_FAILED',
    ),
)]
fn test_submit_score_tie_higher_game_id() {
    // Setup
    let contracts = setup();

    // Create tournament with 5 prize spots
    let mut game_config = test_game_config(contracts.minigame.contract_address);

    // Tournament has 3 prize spots
    game_config.prize_spots = 3;
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, Option::None, Option::None,
        );

    let (player1, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);

    let (player2, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player2", OWNER(), Option::None);

    // Set both players to have the same score
    contracts.minigame.end_game(player1, 100);
    contracts.minigame.end_game(player2, 100);

    // Move to submission phase
    testing::set_block_timestamp(TEST_END_TIME().into());

    // First player submits score - should succeed
    contracts.budokan.submit_score(tournament.id, player1, 1);

    // Second player also tries to submit as position 1 (tie)
    // This should fail since player2's game id is higher than player1's
    contracts.budokan.submit_score(tournament.id, player2, 1);
}

#[test]
fn test_submit_score_tie_lower_game_id() {
    // Setup
    let contracts = setup();

    // Create tournament with 5 prize spots
    let mut game_config = test_game_config(contracts.minigame.contract_address);

    // Tournament has 3 prize spots
    game_config.prize_spots = 3;
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, Option::None, Option::None,
        );

    let (player1, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);

    let (player2, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player2", OWNER(), Option::None);

    // Set both players to have the same score
    contracts.minigame.end_game(player1, 100);
    contracts.minigame.end_game(player2, 100);

    // Move to submission phase
    testing::set_block_timestamp(TEST_END_TIME().into());

    // First player submits score - should succeed
    contracts.budokan.submit_score(tournament.id, player2, 1);

    // Second player also tries to submit as position 1 (tie)
    // This should succeed since player1's game id is lower than player2's
    contracts.budokan.submit_score(tournament.id, player1, 1);

    // get leaderboard
    let leaderboard = contracts.budokan.get_leaderboard(tournament.id);
    assert!(*leaderboard.at(0) == player1, "Player1 should be first place");
    assert!(*leaderboard.at(1) == player2, "Player2 should be second place");
}

#[test]
fn test_submit_score_tie_higher_game_id_for_lower_position() {
    // Setup
    let contracts = setup();
    utils::impersonate(OWNER());

    // Create tournament with 3 prize spots
    let mut game_config = test_game_config(contracts.minigame.contract_address);
    game_config.prize_spots = 3;
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, Option::None, Option::None,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter tournament with three players
    let (token_id1, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);
    let (token_id2, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player2", OWNER(), Option::None);
    let (token_id3, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player3", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    // Set scores - player1 and player2 have the same score, player3 has lower score
    contracts.minigame.end_game(token_id1, 100); // First player (lower ID)
    contracts.minigame.end_game(token_id2, 100); // Second player (higher ID)
    contracts.minigame.end_game(token_id3, 50); // Third player

    // Submit scores in order
    contracts.budokan.submit_score(tournament.id, token_id1, 1); // First place (ID: 1, Score: 100)
    contracts.budokan.submit_score(tournament.id, token_id2, 2); // Second place (ID: 2, Score: 100)
    contracts.budokan.submit_score(tournament.id, token_id3, 3); // Third place (ID: 3, Score: 50)

    // Verify leaderboard
    let leaderboard = contracts.budokan.get_leaderboard(tournament.id);
    assert!(leaderboard.len() == 3, "Invalid leaderboard length");
    assert!(*leaderboard.at(0) == token_id1, "Invalid first place");
    assert!(*leaderboard.at(1) == token_id2, "Invalid second place");
    assert!(*leaderboard.at(2) == token_id3, "Invalid third place");

    // Verify registrations are marked as submitted
    let reg1 = contracts.budokan.get_registration(contracts.minigame.contract_address, token_id1);
    let reg2 = contracts.budokan.get_registration(contracts.minigame.contract_address, token_id2);
    let reg3 = contracts.budokan.get_registration(contracts.minigame.contract_address, token_id3);

    assert!(reg1.has_submitted, "Player 1 should be marked as submitted");
    assert!(reg2.has_submitted, "Player 2 should be marked as submitted");
    assert!(reg3.has_submitted, "Player 3 should be marked as submitted");
}

#[test]
#[should_panic(
    expected: (
        "Tournament: For equal scores, game id 2 should be higher than game id above 3",
        'ENTRYPOINT_FAILED',
    ),
)]
fn test_submit_score_tie_lower_game_id_for_lower_position() {
    // Setup
    let contracts = setup();
    utils::impersonate(OWNER());

    // Create tournament with 3 prize spots
    let mut game_config = test_game_config(contracts.minigame.contract_address);
    game_config.prize_spots = 3;
    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(), test_metadata(), test_schedule(), game_config, Option::None, Option::None,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter tournament with three players
    let (token_id1, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", OWNER(), Option::None);
    let (token_id2, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player2", OWNER(), Option::None);

    testing::set_block_timestamp(TEST_END_TIME().into());

    // Set equal scores for both players
    contracts.minigame.end_game(token_id1, 100); // First player (lower ID)
    contracts.minigame.end_game(token_id2, 100); // Second player (higher ID)

    // Submit higher ID first
    contracts.budokan.submit_score(tournament.id, token_id2, 1); // First place (ID: 3, Score: 100)

    // Try to submit lower ID for second place with same score
    // This should fail because for equal scores, the game ID in lower positions should be higher
    contracts.budokan.submit_score(tournament.id, token_id1, 2); // Second place (ID: 2, Score: 100)
}

#[test]
fn test_add_prize_records_sponsor_address() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create tournament
    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    // Create and impersonate sponsor address
    let sponsor = starknet::contract_address_const::<0x456>();
    utils::impersonate(sponsor);

    // Approve tokens as sponsor
    contracts.erc20.mint(sponsor, STARTING_BALANCE);
    contracts.erc20.approve(contracts.budokan.contract_address, STARTING_BALANCE);

    // Add prize as sponsor
    let prize_id = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            1,
        );

    // Get prize from tournament
    let prize: Prize = contracts.budokan.get_prize(prize_id);

    // Assert sponsor address is correctly recorded
    assert(prize.sponsor_address == sponsor, 'Incorrect sponsor address');
    assert(prize.tournament_id == tournament.id, 'Incorrect tournament id');
    assert(prize.token_address == contracts.erc20.contract_address, 'Incorrect token address');
    assert(prize.payout_position == 1, 'Incorrect payout position');
}

#[test]
fn tournament_with_no_submissions() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create tournament with prizes and premium
    let entry_fee = EntryFee {
        token_address: contracts.erc20.contract_address,
        amount: 100,
        distribution: array![90].span(), // 90% to winner
        tournament_creator_share: Option::Some(10), // 10% creator fee
        game_creator_share: Option::None,
    };

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            Option::Some(entry_fee),
            Option::None,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Add some prizes
    contracts.erc20.approve(contracts.budokan.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.budokan.contract_address, 1);
    let first_prize_id = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: STARTING_BALANCE.low }),
            1,
        );
    let second_prize_id = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc721.contract_address,
            TokenTypeData::erc721(ERC721Data { id: 1 }),
            1,
        );

    // Create multiple players
    let player2 = starknet::contract_address_const::<0x456>();
    let player3 = starknet::contract_address_const::<0x789>();

    // Enter tournament with all players
    contracts.erc20.mint(OWNER(), 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id1, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player1", OWNER(), Option::None);

    utils::impersonate(player2);
    contracts.erc20.mint(player2, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id2, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player2", player2, Option::None);

    utils::impersonate(player3);
    contracts.erc20.mint(player3, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id3, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "test_player3", player3, Option::None);

    // Store initial balances after entry fees are paid
    utils::impersonate(OWNER());
    let creator_balance_after_entries = contracts.erc20.balance_of(OWNER());
    let player2_balance_after_entry = contracts.erc20.balance_of(player2);
    let player3_balance_after_entry = contracts.erc20.balance_of(player3);

    // Move to after tournament and submission period without any score submissions
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // Tournament creator claims all unclaimed prizes since no one submitted scores
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(first_prize_id));
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(second_prize_id));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(1)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::TournamentCreator));

    // Verify tournament creator gets all prizes since no submissions were made
    // Creator should get: sponsored prizes (STARTING_BALANCE) + entry fee pool (270 total from 3
    // players) + creator fee (30 total from 3 players)
    let expected_creator_balance = creator_balance_after_entries + STARTING_BALANCE + 270 + 30;
    assert(
        contracts.erc20.balance_of(OWNER()) == expected_creator_balance,
        'Invalid creator prize claim',
    );

    // Verify other players don't get anything since they didn't submit scores
    assert!(
        contracts.erc20.balance_of(player2) == player2_balance_after_entry,
        "Player2 should get nothing",
    );
    assert!(
        contracts.erc20.balance_of(player3) == player3_balance_after_entry,
        "Player3 should get nothing",
    );

    // Verify NFT prize goes to tournament creator
    assert!(contracts.erc721.owner_of(1) == OWNER(), "NFT should go to creator");

    // Verify tournament entries were recorded but no scores submitted
    assert!(contracts.budokan.tournament_entries(tournament.id) == 3, "Invalid entry count");

    let registration1 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id1);
    let registration2 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id2);
    let registration3 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id3);

    assert!(!registration1.has_submitted, "Player1 should not have submitted");
    assert!(!registration2.has_submitted, "Player2 should not have submitted");
    assert!(!registration3.has_submitted, "Player3 should not have submitted");

    // Verify leaderboard is empty since no scores were submitted
    let leaderboard = contracts.budokan.get_leaderboard(tournament.id);
    assert(leaderboard.len() == 0, 'Leaderboard should be empty');
}

#[test]
fn tournament_with_partial_submissions() {
    let contracts = setup();

    utils::impersonate(OWNER());

    // Create entry fee with equal distribution across 10 positions
    let entry_fee = EntryFee {
        token_address: contracts.erc20.contract_address,
        amount: 100,
        distribution: array![9, 9, 9, 9, 9, 9, 9, 9, 9, 9]
            .span(), // 90% distributed equally to top 10
        tournament_creator_share: Option::Some(10), // 10% creator fee
        game_creator_share: Option::None,
    };

    // Create tournament with 10 prize spots
    let mut game_config = test_game_config(contracts.minigame.contract_address);
    game_config.prize_spots = 10;

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            game_config,
            Option::Some(entry_fee),
            Option::None,
        );

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Add sponsored prizes for first 5 positions
    contracts.erc20.approve(contracts.budokan.contract_address, 500); // 5 prizes of 100 each
    contracts.erc721.approve(contracts.budokan.contract_address, 1);

    let sponsored_prize_1 = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: 100 }),
            1,
        );
    let sponsored_prize_2 = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: 100 }),
            2,
        );
    let sponsored_prize_3 = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: 100 }),
            3,
        );
    let sponsored_prize_4 = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: 100 }),
            4,
        );
    let sponsored_prize_5 = contracts
        .budokan
        .add_prize(
            tournament.id,
            contracts.erc20.contract_address,
            TokenTypeData::erc20(ERC20Data { amount: 100 }),
            5,
        );

    // Create 10 players
    let player1 = OWNER();
    let player2 = starknet::contract_address_const::<0x456>();
    let player3 = starknet::contract_address_const::<0x789>();
    let player4 = starknet::contract_address_const::<0x101>();
    let player5 = starknet::contract_address_const::<0x202>();
    let player6 = starknet::contract_address_const::<0x303>();
    let player7 = starknet::contract_address_const::<0x404>();
    let player8 = starknet::contract_address_const::<0x505>();
    let player9 = starknet::contract_address_const::<0x606>();
    let player10 = starknet::contract_address_const::<0x707>();

    // All 10 players enter tournament
    utils::impersonate(player1);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id1, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player1", player1, Option::None);

    // Player 2 enters
    utils::impersonate(player2);
    contracts.erc20.mint(player2, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id2, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player2", player2, Option::None);

    // Player 3 enters
    utils::impersonate(player3);
    contracts.erc20.mint(player3, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id3, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player3", player3, Option::None);

    // Player 4 enters
    utils::impersonate(player4);
    contracts.erc20.mint(player4, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id4, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player4", player4, Option::None);

    // Player 5 enters
    utils::impersonate(player5);
    contracts.erc20.mint(player5, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id5, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player5", player5, Option::None);

    // Player 6 enters
    utils::impersonate(player6);
    contracts.erc20.mint(player6, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id6, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player6", player6, Option::None);

    // Player 7 enters
    utils::impersonate(player7);
    contracts.erc20.mint(player7, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id7, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player7", player7, Option::None);

    // Player 8 enters
    utils::impersonate(player8);
    contracts.erc20.mint(player8, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id8, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player8", player8, Option::None);

    // Player 9 enters
    utils::impersonate(player9);
    contracts.erc20.mint(player9, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id9, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player9", player9, Option::None);

    // Player 10 enters
    utils::impersonate(player10);
    contracts.erc20.mint(player10, 100);
    contracts.erc20.approve(contracts.budokan.contract_address, 100);
    let (token_id10, _) = contracts
        .budokan
        .enter_tournament(tournament.id, "player10", player10, Option::None);

    // Store initial balances after entry fees are paid
    let player1_balance_after_entry = contracts.erc20.balance_of(player1);
    let player2_balance_after_entry = contracts.erc20.balance_of(player2);
    let player3_balance_after_entry = contracts.erc20.balance_of(player3);
    let player4_balance_after_entry = contracts.erc20.balance_of(player4);
    let player5_balance_after_entry = contracts.erc20.balance_of(player5);

    // Move to end of tournament and set scores for all players
    testing::set_block_timestamp(TEST_END_TIME().into());

    contracts.minigame.end_game(token_id1, 1000); // Best score
    contracts.minigame.end_game(token_id2, 900);
    contracts.minigame.end_game(token_id3, 800);
    contracts.minigame.end_game(token_id4, 700);
    contracts.minigame.end_game(token_id5, 600);
    contracts.minigame.end_game(token_id6, 500); // Not submitted
    contracts.minigame.end_game(token_id7, 400); // Not submitted
    contracts.minigame.end_game(token_id8, 300); // Not submitted
    contracts.minigame.end_game(token_id9, 200); // Not submitted
    contracts.minigame.end_game(token_id10, 100); // Not submitted

    // Submit scores for only the first 5 players
    utils::impersonate(player2);

    contracts.budokan.submit_score(tournament.id, token_id1, 1);
    contracts.budokan.submit_score(tournament.id, token_id2, 2);
    contracts.budokan.submit_score(tournament.id, token_id3, 3);
    contracts.budokan.submit_score(tournament.id, token_id4, 4);
    contracts.budokan.submit_score(tournament.id, token_id5, 5);

    // Move to after submission period
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // Verify leaderboard has only 5 entries
    let leaderboard = contracts.budokan.get_leaderboard(tournament.id);
    assert(leaderboard.len() == 5, 'Leaderboard has 5 entries');
    assert(*leaderboard.at(0) == token_id1, 'Invalid first place');
    assert(*leaderboard.at(1) == token_id2, 'Invalid second place');
    assert(*leaderboard.at(2) == token_id3, 'Invalid third place');
    assert(*leaderboard.at(3) == token_id4, 'Invalid fourth place');
    assert(*leaderboard.at(4) == token_id5, 'Invalid fifth place');

    // Submitters claim their sponsored prizes and entry fee prizes
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(sponsored_prize_1));
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(sponsored_prize_2));
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(sponsored_prize_3));
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(sponsored_prize_4));
    contracts.budokan.claim_prize(tournament.id, PrizeType::Sponsored(sponsored_prize_5));

    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(1)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(2)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(3)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(4)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(5)));

    // Creator claims remaining positions and creator fee
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(6)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(7)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(8)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(9)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::Position(10)));
    contracts.budokan.claim_prize(tournament.id, PrizeType::EntryFees(Role::TournamentCreator));

    // Verify submitters received their rewards
    // Each position gets 9% of total pool (10 players * 100 = 1000), so 90 tokens each
    // Plus sponsored prizes of 100 tokens each
    let expected_prize_per_position = 90; // 9% of 1000
    let sponsored_prize_amount = 100;
    let expected_creator_rewards = 5 * expected_prize_per_position
        + 100; // 5 positions + creator fee

    // Debug: Let's check actual balances vs expected
    let player1_actual = contracts.erc20.balance_of(player1);
    // Player1 is OWNER, so gets position 1 rewards + sponsored prize + creator rewards
    let player1_expected = player1_balance_after_entry
        + expected_prize_per_position
        + sponsored_prize_amount
        + expected_creator_rewards;

    assert!(
        player1_actual == player1_expected,
        "Player1 balance mismatch. Expected: {}, got: {}",
        player1_expected,
        player1_actual,
    );

    assert!(
        contracts.erc20.balance_of(player2) == player2_balance_after_entry
            + expected_prize_per_position
            + sponsored_prize_amount,
        "Player2 should receive position 2 rewards",
    );
    assert!(
        contracts.erc20.balance_of(player3) == player3_balance_after_entry
            + expected_prize_per_position
            + sponsored_prize_amount,
        "Player3 should receive position 3 rewards",
    );
    assert!(
        contracts.erc20.balance_of(player4) == player4_balance_after_entry
            + expected_prize_per_position
            + sponsored_prize_amount,
        "Player4 should receive position 4 rewards",
    );
    assert!(
        contracts.erc20.balance_of(player5) == player5_balance_after_entry
            + expected_prize_per_position
            + sponsored_prize_amount,
        "Player5 should receive position 5 rewards",
    );

    // Verify tournament entries were recorded correctly
    assert!(contracts.budokan.tournament_entries(tournament.id) == 10, "Invalid entry count");

    // Verify only first 5 players submitted scores
    let registration1 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id1);
    let registration2 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id2);
    let registration3 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id3);
    let registration4 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id4);
    let registration5 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id5);
    let registration6 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id6);
    let registration7 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id7);
    let registration8 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id8);
    let registration9 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id9);
    let registration10 = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, token_id10);

    assert!(registration1.has_submitted, "Player1 should have submitted");
    assert!(registration2.has_submitted, "Player2 should have submitted");
    assert!(registration3.has_submitted, "Player3 should have submitted");
    assert!(registration4.has_submitted, "Player4 should have submitted");
    assert!(registration5.has_submitted, "Player5 should have submitted");
    assert!(!registration6.has_submitted, "Player6 should not have submitted");
    assert!(!registration7.has_submitted, "Player7 should not have submitted");
    assert!(!registration8.has_submitted, "Player8 should not have submitted");
    assert!(!registration9.has_submitted, "Player9 should not have submitted");
    assert!(!registration10.has_submitted, "Player10 should not have submitted");
}

//
// TESTS FOR THIRD-PARTY ENTRY FUNCTIONALITY (Issue #129)
//

/// Test that anyone can enter tournament for NFT-qualified participant
#[test]
fn third_party_enter_tournament_with_nft_requirement() {
    let contracts = setup();
    utils::impersonate(OWNER());

    // Setup NFT token for gating
    let nft_token_address = contracts.erc721.contract_address;

    // Mint NFT to qualified player
    let qualified_player = starknet::contract_address_const::<0x111>();
    contracts.erc721.mint(qualified_player, 2);

    // Create tournament gated by NFT
    let entry_requirement_type = EntryRequirementType::token(nft_token_address);
    let entry_requirement = EntryRequirement { entry_limit: 0, entry_requirement_type };

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            Option::None,
            Option::Some(entry_requirement),
        );

    // Start tournament entries
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Third party (different from qualified player) enters tournament for qualified player
    let third_party = starknet::contract_address_const::<0x222>();
    utils::impersonate(third_party);

    let nft_qualification = Option::Some(QualificationProof::NFT(NFTQualification { token_id: 2 }));

    // Third party calls enter_tournament but provides different player_address
    let different_address = starknet::contract_address_const::<0x333>();
    let (game_token_id, entry_number) = contracts
        .budokan
        .enter_tournament(
            tournament.id,
            "qualified_player",
            different_address, // This address should be ignored
            nft_qualification,
        );

    // Verify tournament entry was registered correctly
    let registration = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, game_token_id);
    assert!(registration.tournament_id == tournament.id, "Wrong tournament ID");
    assert!(registration.entry_number == entry_number, "Wrong entry number");
}

/// Test that anyone can enter tournament for tournament-qualified participant
#[test]
fn third_party_enter_tournament_with_tournament_requirement() {
    let contracts = setup();
    utils::impersonate(OWNER());

    // Create first tournament (qualifying tournament)
    let qualifying_tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    // Start and complete qualifying tournament
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let qualified_player = starknet::contract_address_const::<0x111>();
    utils::impersonate(qualified_player);

    let (qualifying_token_id, _) = contracts
        .budokan
        .enter_tournament(
            qualifying_tournament.id, "qualified_player", qualified_player, Option::None,
        );

    // Play game
    testing::set_block_timestamp(TEST_START_TIME().into());
    contracts.minigame.end_game(qualifying_token_id, 100);

    // Submit score
    testing::set_block_timestamp(TEST_END_TIME().into() + 1);
    contracts.budokan.submit_score(qualifying_tournament.id, qualifying_token_id, 1);

    // Finalize qualifying tournament
    let mut time = TEST_END_TIME() + MIN_SUBMISSION_PERIOD + 1;
    testing::set_block_timestamp(time.into());

    // Create second tournament gated by first tournament winners
    utils::impersonate(OWNER());
    let entry_requirement_type = EntryRequirementType::tournament(
        TournamentType::winners(array![qualifying_tournament.id].span()),
    );
    let entry_requirement = EntryRequirement { entry_limit: 0, entry_requirement_type };

    let gated_tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            custom_schedule(
                Option::Some(Period { start: (time).into(), end: (time + 1000).into() }),
                Period { start: (time + 1000).into(), end: (time + 10000).into() },
                MIN_SUBMISSION_PERIOD.into(),
            ),
            test_game_config(contracts.minigame.contract_address),
            Option::None,
            Option::Some(entry_requirement),
        );

    // Start gated tournament entries
    testing::set_block_timestamp(time.into() + 1);

    // Third party enters tournament for qualified player
    let third_party = starknet::contract_address_const::<0x222>();
    utils::impersonate(third_party);

    let tournament_qualification = Option::Some(
        QualificationProof::Tournament(
            TournamentQualification {
                tournament_id: qualifying_tournament.id, token_id: qualifying_token_id, position: 1,
            },
        ),
    );

    // Third party provides different player_address but game should mint to qualified player
    let different_address = starknet::contract_address_const::<0x333>();
    let (game_token_id, _) = contracts
        .budokan
        .enter_tournament(
            gated_tournament.id,
            "qualified_player",
            different_address, // This should be ignored
            tournament_qualification,
        );

    // Verify tournament entry was registered
    let registration = contracts
        .budokan
        .get_registration(contracts.minigame.contract_address, game_token_id);
    assert(registration.tournament_id == gated_tournament.id, 'Wrong tournament ID');
}

/// Test that anyone can enter tournament for allowlist-qualified participant
#[test]
fn third_party_enter_tournament_with_allowlist_requirement() {
    let contracts = setup();
    utils::impersonate(OWNER());

    // Create array of allowed accounts
    let qualified_player = starknet::contract_address_const::<0x111>();
    let allowed_accounts = array![OWNER(), qualified_player].span();

    // Create tournament gated by allowlist
    let entry_requirement_type = EntryRequirementType::allowlist(allowed_accounts);
    let entry_requirement = EntryRequirement { entry_limit: 0, entry_requirement_type };

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            Option::None,
            Option::Some(entry_requirement),
        );

    // Start tournament entries
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Third party enters tournament for allowlisted player
    let third_party = starknet::contract_address_const::<0x222>();
    utils::impersonate(third_party);

    let allowlist_qualification = Option::Some(QualificationProof::Address(qualified_player));

    // Third party provides different player_address
    let different_address = starknet::contract_address_const::<0x333>();
    contracts
        .budokan
        .enter_tournament(
            tournament.id,
            "qualified_player",
            different_address, // This should be ignored
            allowlist_qualification,
        );
}

/// Test that tournaments without entry requirements still work as before
#[test]
fn third_party_enter_tournament_without_requirement_uses_player_address() {
    let contracts = setup();
    utils::impersonate(OWNER());

    // Create tournament without entry requirements
    let tournament = create_basic_tournament(
        contracts.budokan, contracts.minigame.contract_address,
    );

    // Start tournament entries
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Third party enters tournament and provides player_address
    let third_party = starknet::contract_address_const::<0x222>();
    utils::impersonate(third_party);

    let player_address = starknet::contract_address_const::<0x333>();
    contracts
        .budokan
        .enter_tournament(
            tournament.id,
            "player",
            player_address, // This should be used since no entry requirements
            Option::None,
        );
}

/// Test entry limits still work with third-party registration
#[test]
#[should_panic(
    expected: (
        "Tournament: Maximum qualified entries reached for tournament 1", 'ENTRYPOINT_FAILED',
    ),
)]
fn third_party_enter_tournament_respects_entry_limits() {
    let contracts = setup();
    utils::impersonate(OWNER());

    // Setup NFT for gating
    let nft_token_address = contracts.erc721.contract_address;

    // Mint NFTs to different players
    let player1 = starknet::contract_address_const::<0x111>();
    let player2 = starknet::contract_address_const::<0x222>();
    contracts.erc721.mint(player1, 2);
    contracts.erc721.mint(player2, 3);

    // Create tournament with entry limit of 1
    let entry_requirement_type = EntryRequirementType::token(nft_token_address);
    let entry_requirement = EntryRequirement { entry_limit: 1, entry_requirement_type };

    let tournament = contracts
        .budokan
        .create_tournament(
            OWNER(),
            test_metadata(),
            test_schedule(),
            test_game_config(contracts.minigame.contract_address),
            Option::None,
            Option::Some(entry_requirement),
        );

    // Start tournament entries
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    let third_party = starknet::contract_address_const::<0x333>();
    utils::impersonate(third_party);

    // First entry should succeed
    let nft_qualification1 = Option::Some(
        QualificationProof::NFT(NFTQualification { token_id: 2 }),
    );
    contracts.budokan.enter_tournament(tournament.id, "player1", player1, nft_qualification1);

    // attempt to enter a second time using the same qualification proof
    // should panic
    contracts.budokan.enter_tournament(tournament.id, "player2", player2, nft_qualification1);
}
