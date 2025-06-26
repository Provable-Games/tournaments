// SPDX-License-Identifier: UNLICENSED

use core::option::Option;
use starknet::{ContractAddress, testing, contract_address_const};
use dojo::world::{WorldStorage, WorldStorageTrait};
use dojo_cairo_test::{
    spawn_test_world, deploy_contract, NamespaceDef, TestResource, ContractDefTrait, ContractDef,
    WorldStorageTestTrait,
};

use denshokan::constants::DEFAULT_NS;
use game_components_minigame_token::interface::{IMinigameTokenDispatcher};
use game_components_minigame::interface::{IMinigameDetailsDispatcher};

use denshokan::models::denshokan::{
    m_GameMetadata, m_GameRegistry, m_GameRegistryId, m_GameCounter, m_MinterRegistry,
    m_MinterRegistryId, m_MinterCounter, m_TokenMetadata, m_TokenCounter, m_TokenPlayerName,
    m_TokenObjective,
};
use game_components_test_starknet::minigame::mocks::minigame_starknet_mock::{
    minigame_starknet_mock, IMinigameStarknetMockDispatcher, IMinigameStarknetMockDispatcherTrait,
    IMinigameStarknetMockInitDispatcher, IMinigameStarknetMockInitDispatcherTrait,
};
use game_components_test_starknet::metagame::mocks::metagame_starknet_mock::{
    metagame_starknet_mock, IMetagameStarknetMockDispatcher,
    IMetagameStarknetMockInitDispatcher, IMetagameStarknetMockInitDispatcherTrait,
};
// use denshokan::tests::utils;

// Test constants
const OWNER: felt252 = 'OWNER';
const PLAYER: felt252 = 'PLAYER';
const GAME_CREATOR: felt252 = 'GAME_CREATOR';
const GAME_NAME: felt252 = 'TestGame';
const DEVELOPER: felt252 = 'TestDev';
const PUBLISHER: felt252 = 'TestPub';
const GENRE: felt252 = 'Action';
const PLAYER_NAME: felt252 = 'TestPlayer';

fn OWNER_ADDR() -> ContractAddress {
    contract_address_const::<OWNER>()
}

fn PLAYER_ADDR() -> ContractAddress {
    contract_address_const::<PLAYER>()
}

fn GAME_CREATOR_ADDR() -> ContractAddress {
    contract_address_const::<GAME_CREATOR>()
}

#[derive(Drop)]
pub struct TestContracts {
    pub world: WorldStorage,
    pub denshokan: IMinigameTokenDispatcher,
    pub minigame_mock: IMinigameStarknetMockDispatcher,
    pub minigame_mock_score: IMinigameDetailsDispatcher,
    pub metagame_mock: IMetagameStarknetMockDispatcher,
}

//
// Setup
//

fn setup_uninitialized() -> (WorldStorage, ContractAddress, ContractAddress) {
    testing::set_block_number(1);
    testing::set_block_timestamp(1000);

    let ndef = NamespaceDef {
        namespace: DEFAULT_NS(),
        resources: [
            // Denshokan models
            TestResource::Model(m_GameMetadata::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_GameRegistry::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_GameRegistryId::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_GameCounter::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_MinterRegistry::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_MinterRegistryId::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_MinterCounter::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TokenMetadata::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TokenCounter::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TokenPlayerName::TEST_CLASS_HASH.try_into().unwrap()),
            TestResource::Model(m_TokenObjective::TEST_CLASS_HASH.try_into().unwrap()),
            // Events
            TestResource::Event(
                denshokan::denshokan::denshokan::e_Owners::TEST_CLASS_HASH.try_into().unwrap(),
            ),
            TestResource::Event(
                denshokan::denshokan::denshokan::e_ScoreUpdate::TEST_CLASS_HASH.try_into().unwrap(),
            ),
            TestResource::Event(
                denshokan::denshokan::denshokan::e_ObjectiveData::TEST_CLASS_HASH
                    .try_into()
                    .unwrap(),
            ),
            TestResource::Event(
                denshokan::denshokan::denshokan::e_SettingsData::TEST_CLASS_HASH
                    .try_into()
                    .unwrap(),
            ),
            TestResource::Event(
                denshokan::denshokan::denshokan::e_TokenContextData::TEST_CLASS_HASH
                    .try_into()
                    .unwrap(),
            ),
            // Contracts
            TestResource::Contract(denshokan::denshokan::denshokan::TEST_CLASS_HASH),
        ]
            .span(),
    };

    let minigame_mock_address = deploy_contract(
        minigame_starknet_mock::TEST_CLASS_HASH.try_into().unwrap(), array![].span(),
    );
    let metagame_mock_address = deploy_contract(
        metagame_starknet_mock::TEST_CLASS_HASH.try_into().unwrap(), array![].span(),
    );

    let mut contract_defs: Array<ContractDef> = array![
        ContractDefTrait::new(@DEFAULT_NS(), @"denshokan")
            .with_writer_of([dojo::utils::bytearray_hash(@DEFAULT_NS())].span()),
    ];

    let mut world: WorldStorage = spawn_test_world([ndef].span());
    world.sync_perms_and_inits(contract_defs.span());

    (world, minigame_mock_address, metagame_mock_address)
}

pub fn setup() -> TestContracts {
    let (world, minigame_mock_address, metagame_mock_address) = setup_uninitialized();

    let denshokan_address = match world.dns(@"denshokan") {
        Option::Some((address, _)) => address,
        Option::None => panic!("Denshokan contract not found in world DNS"),
    };

    let denshokan = IMinigameTokenDispatcher { contract_address: denshokan_address };
    let minigame_mock = IMinigameStarknetMockDispatcher { contract_address: minigame_mock_address };
    let minigame_mock_init = IMinigameStarknetMockInitDispatcher {
        contract_address: minigame_mock_address,
    };
    let minigame_mock_score = IMinigameDetailsDispatcher {
        contract_address: minigame_mock_address,
    };
    let metagame_mock = IMetagameStarknetMockDispatcher { contract_address: metagame_mock_address };
    let metagame_mock_init = IMetagameStarknetMockInitDispatcher {
        contract_address: metagame_mock_address,
    };

    let (
        _creator, // We'll ignore this and use game_mock_address instead
        name,
        description,
        developer,
        publisher,
        genre,
        image,
        color,
        client_url,
        renderer_address,
        settings_address,
        objectives_address,
    ) =
        create_test_game_metadata();

    // Initialize game mock to support IGameToken interface
    // Use the game_mock_address as the creator since it implements IGameToken
    minigame_mock_init
        .initializer(
            minigame_mock_address, // Use the deployed contract address as creator
            name,
            description,
            developer,
            publisher,
            genre,
            image,
            Option::Some(color),
            client_url,
            renderer_address,
            settings_address,
            objectives_address,
            DEFAULT_NS(),
            denshokan_address,
            true,
            true,
        );

    // create game objective
    minigame_mock.create_objective_score(100);

    // create game settings
    minigame_mock.create_settings_difficulty("Test Settings", "Test Settings Description", 1);

    metagame_mock_init.initializer(DEFAULT_NS(), denshokan_address, true);

    TestContracts { world, denshokan, minigame_mock, minigame_mock_score, metagame_mock }
}

//
// Helper functions
//

fn create_test_game_metadata() -> (
    ContractAddress,
    felt252,
    ByteArray,
    felt252,
    felt252,
    felt252,
    ByteArray,
    ByteArray,
    Option<ByteArray>,
    Option<ContractAddress>,
    Option<ContractAddress>,
    Option<ContractAddress>,
) {
    (
        GAME_CREATOR_ADDR(),
        GAME_NAME,
        "A test game description",
        DEVELOPER,
        PUBLISHER,
        GENRE,
        "https://example.com/image.png",
        "test_color",
        Option::None,
        Option::None,
        Option::None,
        Option::None,
    )
}
