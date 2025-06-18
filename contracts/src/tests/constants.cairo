use starknet::{ContractAddress, contract_address_const};

use budokan::constants::{MIN_REGISTRATION_PERIOD, MIN_TOURNAMENT_LENGTH};

pub fn ADMIN() -> ContractAddress {
    contract_address_const::<'ADMIN'>()
}

pub fn AUTHORIZED() -> ContractAddress {
    contract_address_const::<'AUTHORIZED'>()
}

pub fn ZERO() -> ContractAddress {
    contract_address_const::<0>()
}

pub fn CALLER() -> ContractAddress {
    contract_address_const::<'CALLER'>()
}

pub fn OWNER() -> ContractAddress {
    contract_address_const::<'OWNER'>()
}

pub fn NEW_OWNER() -> ContractAddress {
    contract_address_const::<'NEW_OWNER'>()
}

pub fn OTHER() -> ContractAddress {
    contract_address_const::<'OTHER'>()
}

pub fn OTHER_ADMIN() -> ContractAddress {
    contract_address_const::<'OTHER_ADMIN'>()
}

pub fn SPENDER() -> ContractAddress {
    contract_address_const::<'SPENDER'>()
}

pub fn RECIPIENT() -> ContractAddress {
    contract_address_const::<'RECIPIENT'>()
}

pub fn OPERATOR() -> ContractAddress {
    contract_address_const::<'OPERATOR'>()
}

pub fn BRIDGE() -> ContractAddress {
    contract_address_const::<'BRIDGE'>()
}

pub fn GAME() -> ContractAddress {
    contract_address_const::<'GAME'>()
}

pub fn GAME_NAME() -> felt252 {
    ('Game')
}

pub fn GAME_SYMBOL() -> ByteArray {
    ("GAME")
}

pub fn BASE_URI() -> ByteArray {
    ("https://game.io")
}

pub fn TOURNAMENT_NAME() -> felt252 {
    ('Genesis Tournament')
}

pub fn TOURNAMENT_DESCRIPTION() -> ByteArray {
    ("Genesis Tournament")
}

pub fn SETTINGS_NAME() -> felt252 {
    ('Test Settings')
}

pub fn SETTINGS_DESCRIPTION() -> ByteArray {
    ("Test Settings")
}

pub const STARTING_BALANCE: u256 = 1000000000000000000000;

pub fn TEST_REGISTRATION_START_TIME() -> u32 {
    1
}

pub fn TEST_REGISTRATION_END_TIME() -> u32 {
    TEST_REGISTRATION_START_TIME() + MIN_REGISTRATION_PERIOD
}

pub fn TEST_START_TIME() -> u32 {
    1 + MIN_REGISTRATION_PERIOD
}

pub fn TEST_END_TIME() -> u32 {
    TEST_START_TIME() + MIN_TOURNAMENT_LENGTH
}
