use starknet::ContractAddress;

///
/// Model
///

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct GameDetails {
    #[key]
    pub game_address: ContractAddress,
    pub name: felt252,
}

#[dojo::model]
#[derive(Drop, Serde)]
pub struct GameMetadata {
    #[key]
    pub game_address: ContractAddress,
    pub description: ByteArray,
    pub developer: felt252,
    pub publisher: felt252,
    pub genre: felt252,
    pub image: ByteArray,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct Score {
    #[key]
    pub game_id: u128,
    pub score: u64,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct GameCount {
    #[key]
    pub contract: ContractAddress,
    pub count: u128,
}

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
pub struct GameSettings {
    #[key]
    pub game_id: u128,
    pub settings_id: u32,
}
