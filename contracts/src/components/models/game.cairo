use starknet::ContractAddress;

///
/// Model
///

#[dojo::model]
#[derive(Drop, Serde)]
pub struct GameMetadata {
    #[key]
    pub game_address: ContractAddress,
    pub name: felt252,
    pub description: ByteArray,
    pub developer: felt252,
    pub publisher: felt252,
    pub genre: felt252,
    pub image: ByteArray,
}

#[dojo::model]
#[derive(Copy, Drop, Serde, IntrospectPacked)]
pub struct GameCount {
    #[key]
    pub key: felt252,
    pub count: u64,
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
#[derive(Copy, Drop, Serde, IntrospectPacked)]
pub struct GameSettings {
    #[key]
    pub game_token_id: u64,
    pub settings_id: u32,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct Score {
    #[key]
    pub game_id: u64,
    pub score: u64,
}
