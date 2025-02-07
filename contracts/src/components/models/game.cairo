use starknet::ContractAddress;

///
/// Model
///

#[dojo::model]
#[derive(Drop, Serde)]
pub struct GameMetadata {
    #[key]
    pub address: ContractAddress,
    pub name: felt252,
    pub description: ByteArray,
    pub developer: felt252,
    pub publisher: felt252,
    pub genre: felt252,
    pub image: ByteArray,
}

#[dojo::model]
#[derive(Copy, Drop, Serde, IntrospectPacked)]
pub struct GameCounter {
    #[key]
    pub key: felt252,
    pub count: u64,
}

#[dojo::model]
#[derive(Copy, Drop, Serde, IntrospectPacked)]
pub struct TokenMetadata {
    #[key]
    pub token_id: u64,
    pub minted_by: ContractAddress,
    pub player_name: felt252,
    pub settings_id: u32,
    pub minted_at: u64,
    pub available_at: u64,
    pub expires_at: u64,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct Score {
    #[key]
    pub game_id: u64,
    pub score: u32,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct Settings {
    #[key]
    pub id: u32,
    #[key]
    pub name: felt252,
    pub value: felt252,
}

// part of Settings Component
// add_settings(Array<Settings>, SettingsDetails)
// - assert length of Settings matches number of settings for the game
// - iterate over Settings and verify each name matches a known setting name for the game
// - add Settings and SettingsDetails to the store
// - increment SettingsCounter
#[dojo::model]
#[derive(Drop, Serde)]
pub struct SettingsDetails {
    #[key]
    pub id: u32,
    pub name: felt252,
    pub description: ByteArray,
    pub exists: bool,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct SettingsCounter {
    #[key]
    pub key: felt252,
    pub count: u32,
}
