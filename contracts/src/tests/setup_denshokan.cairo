// SPDX-License-Identifier: UNLICENSED

use starknet::{ContractAddress, contract_address_const};
use starknet::syscalls::deploy_syscall;
use game_components_minigame::interface::{IMinigameDispatcher, IMinigameDispatcherTrait};
use game_components_token::interface::{
    IMinigameTokenMixinDispatcher, IMinigameTokenMixinDispatcherTrait,
};
use game_components_token::examples::{
    full_token_contract::FullTokenContract,
    minigame_registry_contract::{
        MinigameRegistryContract, IMinigameRegistryDispatcher, IMinigameRegistryDispatcherTrait,
    },
};
use game_components_test_starknet::minigame::mocks::minigame_starknet_mock::{
    minigame_starknet_mock, IMinigameStarknetMockDispatcher, IMinigameStarknetMockInitDispatcher,
    IMinigameStarknetMockInitDispatcherTrait,
};
use openzeppelin_token::erc721::interface::{ERC721ABIDispatcher};
use openzeppelin_introspection::interface::ISRC5Dispatcher;
use dojo_cairo_test::deploy_contract;

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
    pub denshokan: IMinigameTokenMixinDispatcher,
    pub minigame_mock: IMinigameStarknetMockDispatcher,
}

//
// Setup
//

pub fn deploy_mock_game() -> (
    IMinigameDispatcher, IMinigameStarknetMockInitDispatcher, IMinigameStarknetMockDispatcher,
) {
    let contract_address = deploy_contract(
        minigame_starknet_mock::TEST_CLASS_HASH.try_into().unwrap(), array![].span(),
    );

    let minigame_dispatcher = IMinigameDispatcher { contract_address };
    let minigame_init_dispatcher = IMinigameStarknetMockInitDispatcher { contract_address };
    let minigame_mock_dispatcher = IMinigameStarknetMockDispatcher { contract_address };
    (minigame_dispatcher, minigame_init_dispatcher, minigame_mock_dispatcher)
}


pub fn deploy_minigame_registry_contract_with_params(
    name: ByteArray,
    symbol: ByteArray,
    base_uri: ByteArray,
    event_relayer_address: Option<ContractAddress>,
) -> IMinigameRegistryDispatcher {
    let mut constructor_calldata = array![];
    name.serialize(ref constructor_calldata);
    symbol.serialize(ref constructor_calldata);
    base_uri.serialize(ref constructor_calldata);

    // Serialize event_relayer_address Option
    match event_relayer_address {
        Option::Some(addr) => {
            constructor_calldata.append(0); // Some variant
            constructor_calldata.append(addr.into());
        },
        Option::None => {
            constructor_calldata.append(1); // None variant
        },
    }

    let contract_address = deploy_contract(
        MinigameRegistryContract::TEST_CLASS_HASH.try_into().unwrap(), constructor_calldata.span(),
    );

    let minigame_registry_dispatcher = IMinigameRegistryDispatcher { contract_address };
    minigame_registry_dispatcher
}

pub fn deploy_optimized_token_contract(
    name: Option<ByteArray>,
    symbol: Option<ByteArray>,
    base_uri: Option<ByteArray>,
    game_registry_address: Option<ContractAddress>,
    event_relayer_address: Option<ContractAddress>,
) -> (IMinigameTokenMixinDispatcher, ERC721ABIDispatcher, ISRC5Dispatcher, ContractAddress) {
    let mut constructor_calldata: Array<felt252> = array![];

    // Set default values if not provided
    let token_name: ByteArray = match name {
        Option::Some(n) => n,
        Option::None => "TestToken",
    };

    let token_symbol: ByteArray = match symbol {
        Option::Some(s) => s,
        Option::None => "TT",
    };

    let token_base_uri: ByteArray = match base_uri {
        Option::Some(uri) => uri,
        Option::None => "https://test.com/",
    };

    // Serialize basic parameters
    token_name.serialize(ref constructor_calldata);
    token_symbol.serialize(ref constructor_calldata);
    token_base_uri.serialize(ref constructor_calldata);

    // Serialize game_registry_address Option
    match game_registry_address {
        Option::Some(addr) => {
            constructor_calldata.append(0); // Some variant
            constructor_calldata.append(addr.into());
        },
        Option::None => {
            constructor_calldata.append(1); // None variant
        },
    }

    // Serialize event_relayer_address Option
    match event_relayer_address {
        Option::Some(addr) => {
            constructor_calldata.append(0); // Some variant
            constructor_calldata.append(addr.into());
        },
        Option::None => {
            constructor_calldata.append(1); // None variant
        },
    }

    let contract_address = deploy_contract(
        FullTokenContract::TEST_CLASS_HASH.try_into().unwrap(), constructor_calldata.span(),
    );

    let token_dispatcher = IMinigameTokenMixinDispatcher { contract_address };
    let erc721_dispatcher = ERC721ABIDispatcher { contract_address };
    let src5_dispatcher = ISRC5Dispatcher { contract_address };

    (token_dispatcher, erc721_dispatcher, src5_dispatcher, contract_address)
}


pub fn setup() -> TestContracts {
    let (_, minigame_init_dispatcher, minigame_mock_dispatcher) = deploy_mock_game();

    let minigame_registry_dispatcher = deploy_minigame_registry_contract_with_params(
        "TestGame", "TT", "https://test.com/", Option::None,
    );

    let (token_dispatcher, _erc721_dispatcher, _src5_dispatcher, _contract_address) =
        deploy_optimized_token_contract(
        Option::None,
        Option::None,
        Option::None,
        Option::Some(minigame_registry_dispatcher.contract_address),
        Option::None,
    );

    minigame_init_dispatcher
        .initializer(
            contract_address_const::<'GAME_CREATOR'>(),
            "TestGame",
            "TestGame",
            "TestDev",
            "TestPub",
            "Genre",
            "Image",
            Option::None,
            Option::None,
            Option::None,
            Option::Some(minigame_mock_dispatcher.contract_address),
            Option::Some(minigame_mock_dispatcher.contract_address),
            token_dispatcher.contract_address,
        );

    TestContracts { denshokan: token_dispatcher, minigame_mock: minigame_mock_dispatcher }
}
