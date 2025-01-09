use core::option::Option;
use starknet::{ContractAddress, get_block_timestamp, testing};
use dojo::world::{WorldStorage};
use dojo_cairo_test::{
    spawn_test_world, NamespaceDef, TestResource, ContractDefTrait, ContractDef,
    WorldStorageTestTrait
};

use tournaments::components::constants::{
    MIN_REGISTRATION_PERIOD, MAX_REGISTRATION_PERIOD, MIN_SUBMISSION_PERIOD, MAX_SUBMISSION_PERIOD,
    MIN_TOURNAMENT_LENGTH, MAX_TOURNAMENT_LENGTH, DEFAULT_NS
};

use tournaments::components::tests::interfaces::WorldTrait;

use tournaments::components::models::{
    game::{m_GameDetails, m_GameMetadata, m_Score, m_GameCount, m_SettingsDetails, m_GameSettings},
    tournament::{
        m_Tournament, m_TournamentToken, m_TournamentEntries, m_TournamentScores,
        m_TournamentTotals, m_TournamentPrize, m_Token, m_TournamentConfig, ERC20Data, ERC721Data,
        Premium, TokenDataType, GatedType, TournamentType
    }
};

use tournaments::tests::{
    utils,
    constants::{
        OWNER, GAME, TOURNAMENT_NAME, TOURNAMENT_DESCRIPTION, STARTING_BALANCE,
        TEST_REGISTRATION_START_TIME, TEST_REGISTRATION_END_TIME, TEST_START_TIME, TEST_END_TIME,
        GAME_NAME
    },
};
use tournaments::components::tests::helpers::{create_basic_tournament, create_settings_details};
use tournaments::components::tests::mocks::{
    erc20_mock::erc20_mock, erc721_mock::erc721_mock, tournament_mock::tournament_mock,
    game_mock::game_mock,
};
use tournaments::components::tests::interfaces::{
    IGameMockDispatcher, IGameMockDispatcherTrait, ITournamentMockDispatcher,
    ITournamentMockDispatcherTrait, IERC20MockDispatcher, IERC20MockDispatcherTrait,
    IERC721MockDispatcher, IERC721MockDispatcherTrait, IGAME_ID, IGAME_METADATA_ID
};

use openzeppelin_token::erc721::interface;
use openzeppelin_token::erc721::{ERC721Component::{Transfer, Approval,}};

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
    emitter: ContractAddress, from: ContractAddress, to: ContractAddress, token_id: u256
) {
    let event = utils::pop_log::<Transfer>(emitter).unwrap();
    assert(event.from == from, 'Invalid `from`');
    assert(event.to == to, 'Invalid `to`');
    assert(event.token_id == token_id, 'Invalid `token_id`');
}

fn assert_only_event_transfer(
    emitter: ContractAddress, from: ContractAddress, to: ContractAddress, token_id: u256
) {
    assert_event_transfer(emitter, from, to, token_id);
    utils::assert_no_events_left(emitter);
}

fn assert_event_approval(
    emitter: ContractAddress, owner: ContractAddress, approved: ContractAddress, token_id: u256
) {
    let event = utils::pop_log::<Approval>(emitter).unwrap();
    assert(event.owner == owner, 'Invalid `owner`');
    assert(event.approved == approved, 'Invalid `approved`');
    assert(event.token_id == token_id, 'Invalid `token_id`');
}

fn assert_only_event_approval(
    emitter: ContractAddress, owner: ContractAddress, approved: ContractAddress, token_id: u256
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
        namespace: "tournaments", resources: [
            // game models
            TestResource::Model(m_GameDetails::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_GameMetadata::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_Score::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_GameCount::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_SettingsDetails::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_GameSettings::TEST_CLASS_HASH.try_into().unwrap()),
            // tournament models
            TestResource::Model(m_Tournament::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TournamentToken::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TournamentEntries::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TournamentScores::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TournamentTotals::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TournamentPrize::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_Token::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TournamentConfig::TEST_CLASS_HASH.try_into().unwrap()),
            // contracts
            TestResource::Contract(tournament_mock::TEST_CLASS_HASH),
            TestResource::Contract(game_mock::TEST_CLASS_HASH),
            TestResource::Contract(erc20_mock::TEST_CLASS_HASH),
            TestResource::Contract(erc721_mock::TEST_CLASS_HASH),
        ].span()
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
        'should support IERC721_ID'
    );
    assert(
        contracts.game.supports_interface(interface::IERC721_METADATA_ID) == true,
        'should support TOKEN_METADATA'
    );
    assert(contracts.game.supports_interface(IGAME_ID) == true, 'should support GAME');
    assert(
        contracts.game.supports_interface(IGAME_METADATA_ID) == true, 'should support GAME_METADATA'
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

    create_settings_details(contracts.game);

    let tournament_token_id = create_basic_tournament(
        contracts.tournament, contracts.game.contract_address
    );

    let token = contracts.tournament.tournament_token(tournament_token_id);
    let tournament_data = contracts.tournament.tournament(token.tournament_id);
    assert(tournament_data.name == TOURNAMENT_NAME(), 'Invalid tournament name');
    assert(
        tournament_data.description == TOURNAMENT_DESCRIPTION(), 'Invalid tournament description'
    );
    assert(
        tournament_data.registration_start_time == TEST_REGISTRATION_START_TIME().into(),
        'Invalid registration start'
    );
    assert(
        tournament_data.registration_end_time == TEST_REGISTRATION_END_TIME().into(),
        'Invalid registration end'
    );
    assert(tournament_data.start_time == TEST_START_TIME().into(), 'Invalid tournament start time');
    assert(tournament_data.end_time == TEST_END_TIME().into(), 'Invalid tournament end time');
    assert(tournament_data.gated_type == Option::None, 'Invalid tournament gated token');
    assert(tournament_data.entry_premium == Option::None, 'Invalid entry premium');
    assert(tournament_data.game_address == contracts.game.contract_address, 'Invalid game address');
    assert(tournament_data.settings_id == 1, 'Invalid settings id');
    assert(contracts.tournament.total_tournaments() == 1, 'Invalid tournaments count');

    // check owns token id 1
    let owner = contracts.tournament.owner_of(1);
    assert(owner == OWNER(), 'Invalid owner');
}

#[test]
#[should_panic(expected: ('start time not in future', 'ENTRYPOINT_FAILED'))]
fn test_create_tournament_start_time_too_close() {
    let contracts = setup();

    create_settings_details(contracts.game);

    contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_END_TIME().into(),
            0,
            TEST_END_TIME().into(),
            MIN_SUBMISSION_PERIOD.into(),
            1, // single top score
            Option::None, // zero gated type
            Option::None, // zero entry premium
            contracts.game.contract_address, // game address
            1, // settings id
        );
}

#[test]
#[should_panic(expected: ('registration period too short', 'ENTRYPOINT_FAILED'))]
fn test_create_tournament_registration_period_too_short() {
    let contracts = setup();

    create_settings_details(contracts.game);

    contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_START_TIME().into() + 1,
            TEST_START_TIME().into(),
            TEST_END_TIME().into(),
            MIN_SUBMISSION_PERIOD.into(),
            1, // single top score
            Option::None, // zero gated type
            Option::None, // zero entry premium
            contracts.game.contract_address, // game address
            1, // settings id
        );
}

#[test]
#[should_panic(expected: ('registration period too long', 'ENTRYPOINT_FAILED'))]
fn test_create_tournament_registration_period_too_long() {
    let contracts = setup();

    create_settings_details(contracts.game);

    contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_START_TIME().into() + MAX_REGISTRATION_PERIOD.into(),
            TEST_START_TIME().into() + MAX_REGISTRATION_PERIOD.into(),
            TEST_END_TIME().into() + MAX_REGISTRATION_PERIOD.into(),
            MIN_SUBMISSION_PERIOD.into(),
            1, // single top score
            Option::None, // zero gated type
            Option::None, // zero entry premium
            contracts.game.contract_address, // game address
            1, // settings id
        );
}

#[test]
#[should_panic(expected: ('registration end too late', 'ENTRYPOINT_FAILED'))]
fn test_create_tournament_end_time_too_close() {
    let contracts = setup();

    create_settings_details(contracts.game);

    contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_END_TIME().into(),
            MIN_REGISTRATION_PERIOD.into(),
            MIN_REGISTRATION_PERIOD.into(),
            MIN_SUBMISSION_PERIOD.into(),
            1, // single top score
            Option::None, // zero gated type
            Option::None, // zero entry premium
            contracts.game.contract_address, // game address
            1, // settings id
        );
}

#[test]
#[should_panic(expected: ('tournament too long', 'ENTRYPOINT_FAILED'))]
fn test_create_tournament_end_time_too_far() {
    let contracts = setup();

    create_settings_details(contracts.game);

    contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_END_TIME().into(),
            TEST_START_TIME().into(),
            (TEST_END_TIME() + MAX_TOURNAMENT_LENGTH).into(),
            MIN_SUBMISSION_PERIOD.into(),
            1, // single top score
            Option::None, // zero gated type
            Option::None, // zero entry premium
            contracts.game.contract_address, // game address
            1, // settings id
        );
}

#[test]
#[should_panic(expected: ('submission period too short', 'ENTRYPOINT_FAILED'))]
fn test_create_tournament_submission_period_too_short() {
    let contracts = setup();

    create_settings_details(contracts.game);

    contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_END_TIME().into(),
            TEST_START_TIME().into(),
            TEST_END_TIME().into(),
            MIN_SUBMISSION_PERIOD.into() - 1,
            1, // single top score
            Option::None, // zero gated type
            Option::None, // zero entry premium
            contracts.game.contract_address, // game address
            1, // settings id
        );
}

#[test]
#[should_panic(expected: ('submission period too long', 'ENTRYPOINT_FAILED'))]
fn test_create_tournament_submission_period_too_long() {
    let contracts = setup();

    create_settings_details(contracts.game);

    contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_END_TIME().into(),
            TEST_START_TIME().into(),
            TEST_END_TIME().into(),
            MAX_SUBMISSION_PERIOD.into() + 1,
            1, // single top score
            Option::None, // zero gated type
            Option::None, // zero entry premium
            contracts.game.contract_address, // game address
            1, // settings id
        );
}

#[test]
fn test_create_tournament_with_prizes() {
    let contracts = setup();

    utils::impersonate(OWNER());

    create_settings_details(contracts.game);

    let tournament_token_id = create_basic_tournament(contracts.tournament, contracts.game.contract_address);

    let token = contracts.tournament.tournament_token(tournament_token_id);

    contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.tournament.contract_address, 1);
    contracts
        .tournament
        .add_prize(
            token.tournament_id,
            contracts.erc20.contract_address,
            TokenDataType::erc20(ERC20Data { token_amount: STARTING_BALANCE.low }),
            1
        );
    contracts
        .tournament
        .add_prize(
            token.tournament_id,
            contracts.erc721.contract_address,
            TokenDataType::erc721(ERC721Data { token_id: 1 }),
            1
        );
    assert(contracts.erc20.balance_of(OWNER()) == 0, 'Invalid balance');
    assert(contracts.erc721.balance_of(OWNER()) == 0, 'Invalid balance');
}

// // #[test]
// // #[should_panic(expected: ('prize token not registered', 'ENTRYPOINT_FAILED'))]
// // fn test_create_tournament_with_prizes_token_not_registered() {
// //     let (_world, mut tournament, _loot_survivor, _pragma, _eth, _lords, mut erc20, mut erc721,
// // _golden_token, _blobert) =
// //         setup();

// //     utils::impersonate(OWNER());
// //     create_basic_tournament(tournament);
// //     erc20.approve(tournament.contract_address, 1);
// //     erc721.approve(tournament.contract_address, 1);

// //     erc20.approve(tournament.contract_address, STARTING_BALANCE);
// //     erc721.approve(tournament.contract_address, 1);
// //     tournament
// //         .add_prize(
// //             1,
// //             erc20.contract_address,
// //             TokenDataType::erc20(ERC20Data { token_amount: STARTING_BALANCE.low }),
// //             1
// //         );
// //     tournament
// //         .add_prize(
// //             1, erc721.contract_address, TokenDataType::erc721(ERC721Data { token_id: 1 }), 1
// //         );
// // }

#[test]
#[should_panic(expected: ('prize position too large', 'ENTRYPOINT_FAILED'))]
fn test_create_tournament_with_prizes_position_too_large() {
    let contracts = setup();

    utils::impersonate(OWNER());

    create_settings_details(contracts.game);

    let tournament_id = create_basic_tournament(contracts.tournament, contracts.game.contract_address);

    let token = contracts.tournament.tournament_token(tournament_id);

    contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
    contracts.erc721.approve(contracts.tournament.contract_address, 1);
    contracts
        .tournament
        .add_prize(
            token.tournament_id,
            contracts.erc20.contract_address,
            TokenDataType::erc20(ERC20Data { token_amount: STARTING_BALANCE.low }),
            2
        );
    contracts
        .tournament
        .add_prize(
            token.tournament_id,
            contracts.erc721.contract_address,
            TokenDataType::erc721(ERC721Data { token_id: 1 }),
            2
        );
}

#[test]
#[should_panic(expected: ('premium distributions too long', 'ENTRYPOINT_FAILED'))]
fn test_create_tournament_with_premiums_too_long() {
    let contracts = setup();

    utils::impersonate(OWNER());

    create_settings_details(contracts.game);

    let entry_premium = Premium {
        token: contracts.erc20.contract_address,
        token_amount: 1,
        token_distribution: array![100, 0].span(),
        creator_fee: 0,
    };

    contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_END_TIME().into(),
            TEST_START_TIME().into(),
            TEST_END_TIME().into(),
            MIN_SUBMISSION_PERIOD.into(),
            1, // single top score
            Option::None, // zero gated type
            Option::Some(entry_premium), // zero entry premium
            contracts.game.contract_address, // game address
            1, // settings id
        );
}

#[test]
#[should_panic(expected: ('premium distributions not 100%', 'ENTRYPOINT_FAILED'))]
fn test_create_tournament_with_premiums_not_100() {
    let contracts = setup();

    utils::impersonate(OWNER());

    create_settings_details(contracts.game);

    let entry_premium = Premium {
        token: contracts.erc20.contract_address,
        token_amount: 1,
        token_distribution: array![95].span(),
        creator_fee: 0,
    };

    contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_END_TIME().into(),
            TEST_START_TIME().into(),
            TEST_END_TIME().into(),
            MIN_SUBMISSION_PERIOD.into(),
            1, // single top score
            Option::None, // zero gated type
            Option::Some(entry_premium), // zero entry premium
            contracts.game.contract_address, // game address
            1, // settings id
        );
}

#[test]
#[should_panic(expected: ('tournament not settled', 'ENTRYPOINT_FAILED'))]
fn test_create_gated_tournament_with_unsettled_tournament() {
    let contracts = setup();

    utils::impersonate(OWNER());

    create_settings_details(contracts.game);

    // Create first tournament
    let first_tournament_token_id = contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_END_TIME().into(),
            TEST_START_TIME().into(),
            TEST_END_TIME().into(),
            MIN_SUBMISSION_PERIOD.into(),
            1, // single top score
            Option::None, // zero gated type
            Option::None, // zero entry premium
            contracts.game.contract_address, // game address
            1, // settings id
        );

    let first_tournament_id = contracts.tournament.tournament_token(first_tournament_token_id).tournament_id;

    // Move to tournament start time
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter first tournament
    let entry_token_id = contracts.tournament.enter_tournament(first_tournament_id, Option::None);

    testing::set_block_timestamp(TEST_START_TIME().into());

    // Start first tournament
    contracts.tournament.start_game(entry_token_id);

    let gated_type = GatedType::tournament(TournamentType::winners(array![first_tournament_token_id.low].span()));

    let current_time = get_block_timestamp();

    // This should panic because the first tournament hasn't been settled yet
    contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            current_time, // start after first tournament
            current_time + MIN_REGISTRATION_PERIOD.into(),
            current_time + MIN_REGISTRATION_PERIOD.into(),
            current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
            MIN_SUBMISSION_PERIOD.into(),
            1,
            Option::Some(gated_type), // Gate by first tournament
            Option::None, // no entry premium
            contracts.game.contract_address, // game address
            1, // settings id
        );
}

#[test]
fn test_create_tournament_gated_by_multiple_tournaments() {
    let contracts = setup();

    utils::impersonate(OWNER());

    create_settings_details(contracts.game);

    // Create first tournament
    let first_tournament_token_id = contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_END_TIME().into(),
            TEST_START_TIME().into(),
            TEST_END_TIME().into(),
            MIN_SUBMISSION_PERIOD.into(),
            1,
            Option::None,
            Option::None,
            contracts.game.contract_address, // game address
            1, // settings id
        );

    // Create second tournament
    let second_tournament_token_id = contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_END_TIME().into(),
            TEST_START_TIME().into(),
            TEST_END_TIME().into(),
            MIN_SUBMISSION_PERIOD.into(),
            1,
            Option::None,
            Option::None,
            contracts.game.contract_address, // game address
            1, // settings id
        );

    let first_tournament_id = contracts.tournament.tournament_token(first_tournament_token_id).tournament_id;
    let second_tournament_id = contracts.tournament.tournament_token(second_tournament_token_id).tournament_id;

    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

    // Enter and complete first tournament
    let first_entry_token_id = contracts.tournament.enter_tournament(first_tournament_id, Option::None);

    testing::set_block_timestamp(TEST_START_TIME().into());

    contracts.tournament.start_game(first_entry_token_id);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.game.end_game(1, 10);
    contracts.tournament.submit_scores(first_tournament_id, array![1]);

    // Enter and complete second tournament
    testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());
    let second_entry_token_id = contracts.tournament.enter_tournament(second_tournament_id, Option::None);
    testing::set_block_timestamp(TEST_START_TIME().into());
    contracts.tournament.start_game(second_entry_token_id);

    testing::set_block_timestamp(TEST_END_TIME().into());
    contracts.game.end_game(2, 20);
    contracts.tournament.submit_scores(second_tournament_id, array![2]);

    // Settle tournaments
    testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

    // Create tournament gated by both previous tournaments
    let gated_type = GatedType::tournament(
        TournamentType::winners(array![first_tournament_token_id.low, second_tournament_token_id.low].span())
    );

    let current_time = get_block_timestamp();
    let gated_tournament_token_id = contracts
        .tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            current_time,
            current_time + MIN_REGISTRATION_PERIOD.into(),
            current_time + MIN_REGISTRATION_PERIOD.into(),
            current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
            MIN_SUBMISSION_PERIOD.into(),
            1,
            Option::Some(gated_type),
            Option::None,
            contracts.game.contract_address, // game address
            1, // settings id
        );

    // Verify the gated tournament was created with correct parameters
    let gated_tournament_id = contracts.tournament.tournament_token(gated_tournament_token_id).tournament_id;
    let gated_tournament = contracts.tournament.tournament(gated_tournament_id);
    assert(gated_tournament.gated_type == Option::Some(gated_type), 'Invalid tournament gate type');

    testing::set_block_timestamp(current_time + MIN_REGISTRATION_PERIOD.into());

    let first_qualifying_token_id = Option::Some(1);
    let second_qualifying_token_id = Option::Some(2);
    // This should succeed since we completed both required tournaments
    contracts.tournament.enter_tournament(gated_tournament_id, first_qualifying_token_id);
    contracts.tournament.enter_tournament(gated_tournament_id, second_qualifying_token_id);

    // Verify entry was successful
    let entries = contracts.tournament.tournament_entries(gated_tournament_id);
    assert(entries == 2, 'Invalid entry count');
}

// #[test]
// fn test_create_tournament_gated_accounts() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     // Create array of allowed accounts
//     let allowed_player = starknet::contract_address_const::<0x456>();
//     let allowed_accounts = array![OWNER(), allowed_player].span();

//     // Create tournament gated by account list
//     let gated_type = GatedType::address(allowed_accounts);

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::Some(gated_type), // gate by accounts
//             Option::None, // no entry premium
//             contracts.game.contract_address, // game address
//             1, // settings id
//         );

//     // Verify tournament was created with correct gating
//     let tournament_data = contracts.tournament.tournament(tournament_id);
//     assert(tournament_data.gated_type == Option::Some(gated_type), 'Invalid tournament gate
//     type');

//     // Start tournament entries
//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     // Allowed account (owner) can enter
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     // Allowed player can enter
//     utils::impersonate(allowed_player);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     utils::impersonate(OWNER());
//     contracts.tournament.start_tournament(tournament_id, false, Option::None,);

//     utils::impersonate(allowed_player);
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     // Verify entries were successful
//     let entries = contracts.tournament.tournament_entries(tournament_id);
//     assert(entries == 2, 'Invalid entry count');
// }

// #[test]
// fn test_create_tournament_season() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1,
//             Option::None,
//             Option::None,
//             contracts.game.contract_address, // game address
//             1, // settings id
//         );
// }

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
// //             token_data_type: TokenDataType::erc20(ERC20Data { token_amount: 1 })
// //         },
// //         Token {
// //             token: erc721.contract_address,
// //             token_data_type: TokenDataType::erc721(ERC721Data { token_id: 1 })
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
// //             token_data_type: TokenDataType::erc20(ERC20Data { token_amount: 1 })
// //         },
// //         Token {
// //             token: erc721.contract_address,
// //             token_data_type: TokenDataType::erc721(ERC721Data { token_id: 1 })
// //         },
// //     ];

// //     tournament.register_tokens(tokens);
// //     let tokens = array![
// //         Token {
// //             token: erc20.contract_address,
// //             token_data_type: TokenDataType::erc20(ERC20Data { token_amount: 1 })
// //         },
// //         Token {
// //             token: erc721.contract_address,
// //             token_data_type: TokenDataType::erc721(ERC721Data { token_id: 1 })
// //         },
// //     ];
// //     tournament.register_tokens(tokens);
// // }

// //
// // Test entering tournaments
// //

// #[test]
// fn test_enter_tournament() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = create_basic_tournament(contracts.tournament);

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);
// }

// #[test]
// #[should_panic(expected: ('invalid gated submission type', 'ENTRYPOINT_FAILED'))]
// fn test_enter_tournament_wrong_submission_type() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     // First create and complete a tournament that will be used as a gate
//     let first_tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1,
//             Option::None,
//             Option::None,
//             contracts.game.contract_address, // game address
//             1, // settings id
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     // Complete the first tournament
//     contracts.tournament.enter_tournament(first_tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(first_tournament_id, false, Option::None,);

//     testing::set_block_timestamp(TEST_END_TIME().into());
//     contracts.game.end_game(1, 100);
//     contracts.tournament.submit_scores(first_tournament_id, array![1]);

//     // Settle first tournament
//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

//     // Create a tournament gated by the previous tournament
//     let gated_type = GatedType::tournament(array![first_tournament_id].span());

//     let current_time = get_block_timestamp();
//     let gated_tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             current_time,
//             current_time + MIN_REGISTRATION_PERIOD.into(),
//             current_time + MIN_REGISTRATION_PERIOD.into(),
//             current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1,
//             Option::Some(gated_type),
//             Option::None,
//             contracts.game.contract_address, // game address
//             1, // settings id
//         );

//     // Try to enter with wrong submission type (token_id instead of game_id)
//     let wrong_submission_type = GatedSubmissionType::token_id(1);

//     testing::set_block_timestamp(current_time + MIN_REGISTRATION_PERIOD.into());

//     // This should panic because we're using token_id submission type for a tournament-gated
//     // tournament
//     contracts.tournament.enter_tournament(gated_tournament_id,
//     Option::Some(wrong_submission_type));
// }

// #[test]
// fn test_enter_tournament_season() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1,
//             Option::None,
//             Option::None,
//             contracts.game.contract_address, // game address
//             1, // settings id
//         );

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);
// }

// //
// // Test starting tournaments
// //

// #[test]
// fn test_start_tournament() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium,
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     // check tournament entries
//     assert(contracts.tournament.tournament_entries(tournament_id) == 1, 'Invalid entries');
//     // check owner now has game token
//     assert(contracts.game.owner_of(1) == OWNER(), 'Invalid owner');
// }

// #[test]
// #[should_panic(expected: ('all entries started', 'ENTRYPOINT_FAILED'))]
// fn test_start_tournament_entry_already_started() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium,
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);
// }

// #[test]
// fn test_start_tournament_multiple_starts() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium,
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::Some(1));
//     contracts.tournament.start_tournament(tournament_id, false, Option::Some(1));
// }

// #[test]
// fn test_start_tournament_multiple_starts_multiple_addresses() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium,
//             contracts.game.contract_address,
//             1
//         );

//     // Create multiple players
//     let player2 = starknet::contract_address_const::<0x456>();
//     let player3 = starknet::contract_address_const::<0x789>();

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     utils::impersonate(player2);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     utils::impersonate(player3);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     utils::impersonate(OWNER());

//     contracts.tournament.start_tournament(tournament_id, true, Option::Some(2),);

//     utils::impersonate(player3);
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);
// }

// #[test]
// fn test_start_tournament_season() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1,
//             Option::None,
//             Option::None,
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);
// }

// //
// // Test submitting scores
// //

// #[test]
// fn test_submit_scores() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium,
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(1, 10);

//     contracts.tournament.submit_scores(tournament_id, array![1]);
//     let scores = contracts.tournament.top_scores(tournament_id);
//     assert(scores.len() == 1, 'Invalid scores length');
//     assert(*scores.at(0) == 1, 'Invalid score');
// }

// #[test]
// fn test_submit_multiple_scores() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             3, // three top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(1, 1);
//     contracts.game.end_game(2, 2);
//     contracts.game.end_game(3, 5);
//     contracts.game.end_game(4, 1);

//     contracts.tournament.submit_scores(tournament_id, array![3, 2, 1]);
//     let scores = contracts.tournament.top_scores(tournament_id);
//     assert(scores.len() == 3, 'Invalid scores length');
//     assert(*scores.at(0) == 3, 'Invalid score');
//     assert(*scores.at(1) == 2, 'Invalid score');
//     assert(*scores.at(2) == 1, 'Invalid score');
// }

// #[test]
// fn test_submit_scores_earliest_submission_wins() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             2, // two top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     // Complete tournament with tied scores but different death dates
//     contracts.tournament.enter_tournament(tournament_id, Option::None);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, true, Option::None);

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(1, 1);
//     contracts.game.end_game(2, 1);

//     contracts.tournament.submit_scores(tournament_id, array![2, 1]);

//     let scores = contracts.tournament.top_scores(tournament_id);
//     assert(*scores.at(0) == 2, 'Wrong tiebreaker winner');
//     assert(*scores.at(1) == 1, 'Wrong tiebreaker loser');
// }

// #[test]
// #[should_panic(expected: ('tournament already settled', 'ENTRYPOINT_FAILED'))]
// fn test_submit_scores_after_submission_period() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     // Create tournament with specific timing
//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(), // start time
//             TEST_END_TIME().into(), // end time
//             MIN_SUBMISSION_PERIOD.into(), // submission period
//             1, // single top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     // Enter tournament
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     // Start tournament
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     contracts.game.end_game(1, 1);

//     // Move timestamp to after submission period ends
//     // Tournament end (3 + MIN_REGISTRATION_PERIOD) + submission period
//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

//     // This should panic with 'tournament already settled'
//     contracts.tournament.submit_scores(tournament_id, array![1]);
// }

// #[test]
// #[should_panic(expected: ('tournament not ended', 'ENTRYPOINT_FAILED'))]
// fn test_submit_scores_before_tournament_ends() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     // Create tournament with future start time
//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(), // start time
//             TEST_END_TIME().into(), // end time
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     // Enter tournament
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     // Start tournament
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     // Create adventurer with score
//     contracts.game.end_game(1, 1);

//     // Attempt to submit scores before tournament starts
//     // This should panic with 'tournament not started'
//     contracts.tournament.submit_scores(tournament_id, array![1]);
// }

// #[test]
// fn test_submit_scores_replace_lower_score() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     // Create tournament with multiple top scores
//     let tournament_id = contracts
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
//             Option::None,
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     // Create multiple players
//     let player2 = starknet::contract_address_const::<0x456>();
//     let player3 = starknet::contract_address_const::<0x789>();

//     // Enter tournament with all players
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     utils::impersonate(player2);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     utils::impersonate(player3);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     utils::impersonate(OWNER());
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     utils::impersonate(player2);
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     utils::impersonate(player3);
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(1, 5); // Owner's game
//     contracts.game.end_game(2, 10); // Player2's game
//     contracts.game.end_game(3, 15); // Player3's game

//     utils::impersonate(OWNER());
//     contracts.tournament.submit_scores(tournament_id, array![1]);

//     // // Verify initial rankings
//     let scores = contracts.tournament.top_scores(tournament_id);
//     assert(scores.len() == 1, 'Invalid scores length');
//     assert(*scores.at(0) == 1, 'Wrong top score'); // owner

//     utils::impersonate(player2);
//     contracts.tournament.submit_scores(tournament_id, array![1, 3, 2]);

//     // Verify updated rankings
//     let updated_scores = contracts.tournament.top_scores(tournament_id);
//     assert(updated_scores.len() == 3, 'Invalid updated scores length');
//     assert(*updated_scores.at(0) == 1, 'Wrong new top score'); // Owner
//     assert(*updated_scores.at(1) == 3, 'Wrong new second score'); // Player3
//     assert(*updated_scores.at(2) == 2, 'Wrong new third score'); // Player2
// }

// //
// // Test distributing rewards
// //

// #[test]
// fn test_distribute_prizes_with_prizes() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium,
//             contracts.game.contract_address,
//             1
//         );
//     // register_tokens_for_test(tournament, erc20, erc721);

//     contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
//     contracts.erc721.approve(contracts.tournament.contract_address, 1);
//     contracts
//         .tournament
//         .add_prize(
//             tournament_id,
//             contracts.erc20.contract_address,
//             TokenDataType::erc20(ERC20Data { token_amount: STARTING_BALANCE.low }),
//             1
//         );
//     contracts
//         .tournament
//         .add_prize(
//             tournament_id,
//             contracts.erc721.contract_address,
//             TokenDataType::erc721(ERC721Data { token_id: 1 }),
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(1, 1);

//     contracts.tournament.submit_scores(tournament_id, array![1]);

//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
//     contracts.tournament.distribute_prizes(tournament_id, array![1, 2]);

//     // check balances of owner after claiming prizes
//     assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE, 'Invalid balance');
//     assert(contracts.erc721.owner_of(1) == OWNER(), 'Invalid owner');
// }

// #[test]
// #[should_panic(expected: ('prize already claimed', 'ENTRYPOINT_FAILED'))]
// fn test_distribute_prizes_prize_already_claimed() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium,
//             contracts.game.contract_address,
//             1
//         );
//     // register_tokens_for_test(tournament, erc20, erc721);

//     contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
//     contracts.erc721.approve(contracts.tournament.contract_address, 1);
//     contracts
//         .tournament
//         .add_prize(
//             tournament_id,
//             contracts.erc20.contract_address,
//             TokenDataType::erc20(ERC20Data { token_amount: STARTING_BALANCE.low }),
//             1
//         );
//     contracts
//         .tournament
//         .add_prize(
//             tournament_id,
//             contracts.erc721.contract_address,
//             TokenDataType::erc721(ERC721Data { token_id: 1 }),
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(1, 1);

//     contracts.tournament.submit_scores(tournament_id, array![1]);

//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
//     contracts.tournament.distribute_prizes(tournament_id, array![1, 2]);
//     contracts.tournament.distribute_prizes(tournament_id, array![1, 2]);
// }

// #[test]
// fn test_distribute_prizes_with_gated_tokens_criteria() {
//     let contracts = setup();

//     utils::impersonate(OWNER());
//     // register_tokens_for_test(tournament, erc20, erc721);

//     let gated_type = GatedType::token(
//         GatedToken {
//             token: contracts.erc721.contract_address,
//             entry_type: GatedEntryType::criteria(
//                 array![EntryCriteria { token_id: 1, entry_count: 2 }].span()
//             ),
//         }
//     );

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::Some(gated_type), // zero gated type
//             Option::None, // zero entry premium
//             contracts.game.contract_address,
//             1
//         );

//     let tournament_data = contracts.tournament.tournament(tournament_id);
//     assert(
//         tournament_data.gated_type == Option::Some(gated_type), 'Invalid tournament gated token'
//     );
//     let gated_submission_type = GatedSubmissionType::token_id(1);

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::Some(gated_submission_type));

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     // check tournament entries
//     assert(contracts.tournament.tournament_entries(tournament_id) == 2, 'Invalid entries');
//     // check owner now has game token
//     assert(contracts.game.owner_of(1) == OWNER(), 'Invalid owner');
//     assert(contracts.game.owner_of(2) == OWNER(), 'Invalid owner');

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(1, 1);
//     contracts.tournament.submit_scores(tournament_id, array![1]);
// }

// #[test]
// fn test_distribute_prizes_with_gated_tokens_uniform() {
//     let contracts = setup();

//     utils::impersonate(OWNER());
//     // register_tokens_for_test(tournament, erc20, erc721);

//     let gated_type = GatedType::token(
//         GatedToken {
//             token: contracts.erc721.contract_address, entry_type: GatedEntryType::uniform(3),
//         }
//     );

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::Some(gated_type), // zero gated type
//             Option::None, // zero entry premium
//             contracts.game.contract_address,
//             1
//         );

//     let tournament_data = contracts.tournament.tournament(tournament_id);
//     assert(
//         tournament_data.gated_type == Option::Some(gated_type), 'Invalid tournament gated token'
//     );
//     let gated_submission_type = GatedSubmissionType::token_id(1);

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::Some(gated_submission_type));

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     // check tournament entries
//     assert(contracts.tournament.tournament_entries(tournament_id) == 3, 'Invalid entries');
//     // check owner now has game token
//     assert(contracts.game.owner_of(1) == OWNER(), 'Invalid owner');
//     assert(contracts.game.owner_of(2) == OWNER(), 'Invalid owner');
//     assert(contracts.game.owner_of(3) == OWNER(), 'Invalid owner');

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(1, 1);

//     contracts.tournament.submit_scores(tournament_id, array![1]);
// }

// #[test]
// fn test_distribute_prizes_with_gated_tournaments() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::None, // zero gated type
//             Option::None, // zero entry premium
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(1, 1);

//     contracts.tournament.submit_scores(tournament_id, array![1]);

//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

//     // define a new tournament that has a gated type of the first tournament
//     let gated_type = GatedType::tournament(array![1].span());

//     let current_time = get_block_timestamp();

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             current_time,
//             current_time + MIN_REGISTRATION_PERIOD.into(),
//             current_time + MIN_REGISTRATION_PERIOD.into(),
//             current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::Some(gated_type), // zero gated type
//             Option::None, // zero entry premium
//             contracts.game.contract_address,
//             1
//         );

//     let tournament_data = contracts.tournament.tournament(tournament_id);
//     assert(
//         tournament_data.gated_type == Option::Some(gated_type), 'Invalid tournament gated token'
//     );
//     // submit game id 1
//     let gated_submission_type = GatedSubmissionType::game_id(array![1].span());

//     testing::set_block_timestamp(current_time);

//     contracts.tournament.enter_tournament(tournament_id, Option::Some(gated_submission_type));

//     testing::set_block_timestamp(current_time + MIN_REGISTRATION_PERIOD.into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     testing::set_block_timestamp(
//         current_time + MIN_REGISTRATION_PERIOD.into() + MIN_TOURNAMENT_LENGTH.into()
//     );

//     contracts.game.end_game(2, 1);

//     contracts.tournament.submit_scores(tournament_id, array![2]);
// }

// #[test]
// fn test_distribute_prizes_with_premiums() {
//     let contracts = setup();

//     utils::impersonate(OWNER());
//     // register_tokens_for_test(tournament, erc20, erc721);

//     let entry_premium = Premium {
//         token: contracts.erc20.contract_address,
//         token_amount: 1,
//         token_distribution: array![100].span(),
//         creator_fee: 0,
//     };

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::None, // zero gated type
//             Option::Some(entry_premium), // zero entry premium
//             contracts.game.contract_address,
//             1
//         );

//     let tournament_data = contracts.tournament.tournament(tournament_id);
//     assert(
//         tournament_data.entry_premium == Option::Some(entry_premium), 'Invalid entry
//     premium'
//     );

//     // handle approval for the premium
//     contracts.erc20.approve(contracts.tournament.contract_address, 1);

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     // check owner now has 1 less premium token
//     assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE - 1, 'Invalid balance');

//     // check tournament now has premium funds
//     assert(
//         contracts.erc20.balance_of(contracts.tournament.contract_address) == 1, 'Invalid balance'
//     );

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(1, 1);

//     contracts.tournament.submit_scores(tournament_id, array![1]);

//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
//     contracts.tournament.distribute_prizes(tournament_id, array![1]);

//     // check owner now has all premium funds back
//     assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE, 'Invalid balance');
// }

// #[test]
// fn test_distribute_prizes_with_premium_creator_fee() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     // Create premium with 10% creator fee and 90% to winner
//     let entry_premium = Premium {
//         token: contracts.erc20.contract_address,
//         token_amount: 100, // 100 tokens per entry
//         token_distribution: array![100].span(), // 100% to winner
//         creator_fee: 10, // 10% creator fee
//     };

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1, // single top score
//             Option::None, // zero gated type
//             Option::Some(entry_premium), // premium with creator fee
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     // Enter tournament with two players
//     utils::impersonate(OWNER());
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     let player2 = starknet::contract_address_const::<0x456>();
//     utils::impersonate(player2);
//     contracts.erc20.mint(player2, 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     let creator_initial_balance = contracts.erc20.balance_of(OWNER());

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     utils::impersonate(OWNER());
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     utils::impersonate(player2);
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     // Set scores (player2 wins)
//     contracts.game.end_game(1, 1);
//     contracts.game.end_game(2, 1);

//     utils::impersonate(OWNER());
//     contracts.tournament.submit_scores(tournament_id, array![2]);

//     // Verify creator fee distribution (10% of 200 total = 20)
//     assert(
//         contracts.erc20.balance_of(OWNER()) == creator_initial_balance + 20, 'Invalid creator
//         fee'
//     );

//     // Check initial balances
//     let winner_initial_balance = contracts.erc20.balance_of(player2);

//     // Distribute rewards
//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
//     contracts.tournament.distribute_prizes(tournament_id, array![1]);

//     // Verify winner prize distribution (90% of 200 total = 180)
//     assert(
//         contracts.erc20.balance_of(player2) == winner_initial_balance + 180,
//         'Invalid winner distribution'
//     );
// }

// #[test]
// fn test_distribute_prizes_with_premium_multiple_winners() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     // Create premium with 10% creator fee and split remaining 90% between top 3:
//     // 1st: 50%, 2nd: 30%, 3rd: 20%
//     let entry_premium = Premium {
//         token: contracts.erc20.contract_address,
//         token_amount: 100, // 100 tokens per entry
//         token_distribution: array![50, 30, 20].span(), // Distribution percentages
//         creator_fee: 10, // 10% creator fee
//     };

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             3, // three top scores
//             Option::None, // zero gated type
//             Option::Some(entry_premium), // premium with distribution
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     // Create and enter with 4 players
//     let player2 = starknet::contract_address_const::<0x456>();
//     let player3 = starknet::contract_address_const::<0x789>();
//     let player4 = starknet::contract_address_const::<0x101>();

//     // Owner enters
//     utils::impersonate(OWNER());
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     // Player 2 enters
//     utils::impersonate(player2);
//     contracts.erc20.mint(player2, 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     // Player 3 enters
//     utils::impersonate(player3);
//     contracts.erc20.mint(player3, 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     // Player 4 enters
//     utils::impersonate(player4);
//     contracts.erc20.mint(player4, 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     let third_initial = contracts.erc20.balance_of(OWNER());

//     // Start games for all players
//     utils::impersonate(OWNER());
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     utils::impersonate(player2);
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     utils::impersonate(player3);
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     utils::impersonate(player4);
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(2, 100); // player2's game
//     contracts.game.end_game(3, 75); // player3's game
//     contracts.game.end_game(1, 50); // owner's game
//     contracts.game.end_game(4, 25); // player4's game

//     // Submit scores
//     utils::impersonate(player2);
//     contracts.tournament.submit_scores(tournament_id, array![2, 3, 1]);

//     // Store initial balances
//     let first_initial = contracts.erc20.balance_of(player2);
//     let second_initial = contracts.erc20.balance_of(player3);

//     // Distribute rewards
//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
//     // 3 premium prizes
//     contracts.tournament.distribute_prizes(tournament_id, array![1, 2, 3]);

//     // Total pool = 4 players * 100 tokens = 400 tokens
//     // Creator fee = 10% of 400 = 40 tokens
//     // Remaining pool = 360 tokens
//     // 1st place (50%) = 180 tokens
//     // 2nd place (30%) = 108 tokens
//     // 3rd place (20%) = 72 tokens

//     // Verify winner distributions
//     assert(
//         contracts.erc20.balance_of(player2) == first_initial + 180, 'Invalid first distribution'
//     );
//     assert(
//         contracts.erc20.balance_of(player3) == second_initial + 108, 'Invalid second
//         distribution'
//     );
//     assert(
//         contracts.erc20.balance_of(OWNER()) == third_initial + 72 + 40, 'Invalid third
//         distribution'
//     );
// }

// #[test]
// fn test_tournament_with_no_submissions() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     // Create tournament with prizes and premium
//     let entry_premium = Premium {
//         token: contracts.erc20.contract_address,
//         token_amount: 100,
//         token_distribution: array![100].span(), // 100% to winner
//         creator_fee: 10, // 10% creator fee
//     };

//     let tournament_id = contracts
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
//             Option::Some(entry_premium),
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     // Add some prizes
//     contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
//     contracts.erc721.approve(contracts.tournament.contract_address, 1);
//     contracts
//         .tournament
//         .add_prize(
//             tournament_id,
//             contracts.erc20.contract_address,
//             TokenDataType::erc20(ERC20Data { token_amount: STARTING_BALANCE.low }),
//             1
//         );
//     contracts
//         .tournament
//         .add_prize(
//             tournament_id,
//             contracts.erc721.contract_address,
//             TokenDataType::erc721(ERC721Data { token_id: 1 }),
//             1
//         );

//     // Create multiple players
//     let player2 = starknet::contract_address_const::<0x456>();
//     let player3 = starknet::contract_address_const::<0x789>();

//     // Enter tournament with all players
//     contracts.erc20.mint(OWNER(), 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     utils::impersonate(player2);
//     contracts.erc20.mint(player2, 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     utils::impersonate(player3);
//     contracts.erc20.mint(player3, 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     // Store initial balances
//     let creator_initial = contracts.erc20.balance_of(OWNER());

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     utils::impersonate(OWNER());
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     utils::impersonate(player2);
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     utils::impersonate(player3);
//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     // Move to after tournament and submission period without any score submissions
//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

//     // Distribute rewards
//     utils::impersonate(OWNER());
//     // 2 deposited prizes and 1 tournament premium prize
//     contracts.tournament.distribute_prizes(tournament_id, array![1, 2, 3]);

//     // Verify final state
//     let final_scores = contracts.tournament.top_scores(tournament_id);
//     assert(final_scores.len() == 0, 'Should have no scores');

//     // Verify first caller gets all prizes
//     // creator also gets the prize balance back (STARTING BALANCE)
//     assert(
//         contracts.erc20.balance_of(OWNER()) == creator_initial + 300 + STARTING_BALANCE,
//         'Invalid owner refund'
//     );
//     assert(contracts.erc20.balance_of(player2) == 0, 'Invalid player2 refund');
//     assert(contracts.erc20.balance_of(player3) == 0, 'Invalid player3 refund');

//     // Verify prize returns to tournament creator
//     assert(contracts.erc721.owner_of(1) == OWNER(), 'Prize should return to caller');
// }

// #[test]
// fn test_tournament_with_no_starts() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     // Create tournament with prizes and premium
//     let entry_premium = Premium {
//         token: contracts.erc20.contract_address,
//         token_amount: 100,
//         token_distribution: array![100].span(), // 100% to winner
//         creator_fee: 10, // 10% creator fee
//     };

//     let tournament_id = contracts
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
//             Option::Some(entry_premium),
//             contracts.game.contract_address,
//             1
//         );

//     // Add some prizes
//     contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
//     contracts.erc721.approve(contracts.tournament.contract_address, 1);
//     contracts
//         .tournament
//         .add_prize(
//             tournament_id,
//             contracts.erc20.contract_address,
//             TokenDataType::erc20(ERC20Data { token_amount: STARTING_BALANCE.low }),
//             1
//         );
//     contracts
//         .tournament
//         .add_prize(
//             tournament_id,
//             contracts.erc721.contract_address,
//             TokenDataType::erc721(ERC721Data { token_id: 1 }),
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     // Create multiple players
//     let player2 = starknet::contract_address_const::<0x456>();
//     let player3 = starknet::contract_address_const::<0x789>();

//     // Enter tournament with all players
//     contracts.erc20.mint(OWNER(), 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     utils::impersonate(player2);
//     contracts.erc20.mint(player2, 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     utils::impersonate(player3);
//     contracts.erc20.mint(player3, 100);
//     contracts.erc20.approve(contracts.tournament.contract_address, 100);
//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     // Store initial balances
//     let creator_initial = contracts.erc20.balance_of(OWNER());

//     // Move to after tournament and submission period without any score submissions
//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());

//     // Distribute rewards
//     utils::impersonate(OWNER());
//     // 2 deposited prizes and 1 tournament premium prize
//     contracts.tournament.distribute_prizes(tournament_id, array![1, 2, 3]);

//     // Verify final state
//     let final_scores = contracts.tournament.top_scores(tournament_id);
//     assert(final_scores.len() == 0, 'Should have no scores');

//     // Verify first caller gets all prizes
//     // creator also gets the prize balance back (STARTING BALANCE)
//     assert(
//         contracts.erc20.balance_of(OWNER()) == creator_initial + 300 + STARTING_BALANCE,
//         'Invalid owner refund'
//     );
//     assert(contracts.erc20.balance_of(player2) == 0, 'Invalid player2 refund');
//     assert(contracts.erc20.balance_of(player3) == 0, 'Invalid player3 refund');

//     // Verify prize returns to tournament creator
//     assert(contracts.erc721.owner_of(1) == OWNER(), 'Prize should return to caller');
// }

// #[test]
// fn test_distribute_prizes_season() {
//     let contracts = setup();

//     utils::impersonate(OWNER());

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1,
//             Option::None,
//             Option::None,
//             contracts.game.contract_address,
//             1
//         );

//     contracts.erc20.approve(contracts.tournament.contract_address, STARTING_BALANCE);
//     contracts.erc721.approve(contracts.tournament.contract_address, 1);
//     contracts
//         .tournament
//         .add_prize(
//             tournament_id,
//             contracts.erc20.contract_address,
//             TokenDataType::erc20(ERC20Data { token_amount: STARTING_BALANCE.low }),
//             1
//         );
//     contracts
//         .tournament
//         .add_prize(
//             tournament_id,
//             contracts.erc721.contract_address,
//             TokenDataType::erc721(ERC721Data { token_id: 1 }),
//             1
//         );

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     testing::set_block_timestamp(TEST_END_TIME().into());

//     contracts.game.end_game(1, 1);

//     contracts.tournament.submit_scores(tournament_id, array![1]);

//     testing::set_block_timestamp((TEST_END_TIME() + MIN_SUBMISSION_PERIOD).into());
//     contracts.tournament.distribute_prizes(tournament_id, array![1, 2]);

//     // check balances of owner after claiming prizes
//     assert(contracts.erc20.balance_of(OWNER()) == STARTING_BALANCE, 'Invalid balance');
//     assert(contracts.erc721.owner_of(1) == OWNER(), 'Invalid owner');
// }

// //
// // Test register game
// //

// #[test]
// fn test_register_game() {
//     let contracts = setup();

//     contracts.tournament.register_game(GAME(), GAME_NAME());

//     let game_name = contracts.tournament.game(GAME()).name;
//     assert(game_name == GAME_NAME(), 'Invalid game name');
// }

// #[test]
// fn test_create_tournament_with_settings() {
//     let contracts = setup();

//     contracts.tournament.register_game(GAME(), GAME_NAME());

//     contracts
//         .game
//         .add_settings(
//             'Settings',
//             "Description",
//             array!['Max Health', 'Strength', 'Speed'].span(),
//             array![100, 10, 10].span()
//         );

//     contracts.game.new_game(1, OWNER());

//     contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1,
//             Option::None,
//             Option::None,
//             GAME(),
//             1
//         );

//     let game_name = contracts.tournament.game(GAME()).name;
//     assert(game_name == GAME_NAME(), 'Invalid game name');

//     let setting_1 = contracts.game.get_setting(1, 'Max Health');
//     let setting_2 = contracts.game.get_setting(1, 'Strength');
//     let setting_3 = contracts.game.get_setting(1, 'Speed');

//     assert(setting_1 == 100, 'Invalid setting 1');
//     assert(setting_2 == 10, 'Invalid setting 2');
//     assert(setting_3 == 10, 'Invalid setting 3');

//     let settings_id = contracts.game.get_settings_id(1);
//     assert(settings_id == 1, 'Invalid settings id');

//     let settings_details = contracts.game.get_settings_details(1);
//     assert(settings_details.name == 'Settings', 'Invalid settings name');
//     assert(settings_details.description == "Description", 'Invalid settings description');
//     assert(settings_details.exists == true, 'Invalid settings exists');
// }

// #[test]
// fn test_start_tournament_with_settings() {
//     let contracts = setup();

//     contracts.tournament.register_game(GAME(), GAME_NAME());

//     contracts
//         .game
//         .add_settings(
//             'Settings',
//             "Description",
//             array!['Max Health', 'Strength', 'Speed'].span(),
//             array![100, 10, 10].span()
//         );

//     let tournament_id = contracts
//         .tournament
//         .create_tournament(
//             TOURNAMENT_NAME(),
//             TOURNAMENT_DESCRIPTION(),
//             TEST_REGISTRATION_START_TIME().into(),
//             TEST_REGISTRATION_END_TIME().into(),
//             TEST_START_TIME().into(),
//             TEST_END_TIME().into(),
//             MIN_SUBMISSION_PERIOD.into(),
//             1,
//             Option::None,
//             Option::None,
//             contracts.game.contract_address,
//             1
//         );

//     testing::set_block_timestamp(TEST_REGISTRATION_START_TIME().into());

//     contracts.tournament.enter_tournament(tournament_id, Option::None);

//     testing::set_block_timestamp(TEST_START_TIME().into());

//     contracts.tournament.start_tournament(tournament_id, false, Option::None);

//     let settings_id = contracts.game.get_settings_id(1);
//     assert(settings_id == 1, 'Invalid settings id');
// }


