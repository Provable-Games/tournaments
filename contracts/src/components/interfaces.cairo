use starknet::ContractAddress;
use dojo::world::{WorldStorage, WorldStorageTrait, IWorldDispatcher};

use tournaments::components::models::game::SettingsDetails;

use tournaments::components::libs::utils::ZERO;

pub const IGAME_ID: felt252 = 0x027fd8d2e685b5a61e4516152831e8730c27b25c9f831ec27c1e48a46e55086a;
pub const IGAME_METADATA_ID: felt252 =
    0xdbe4736acc1847cb2bca994503d50e7fc21daf5cc7b76688ad4d6788c0a9f1;

#[starknet::interface]
pub trait IGame<TState> {
    fn get_score(self: @TState, game_id: u256) -> u64;
    fn get_setting(self: @TState, settings_id: u32, key: felt252) -> u64;
    fn get_settings_id(self: @TState, game_id: u256) -> u32;
    fn get_settings_details(self: @TState, settings_id: u32) -> SettingsDetails;
    fn settings_exists(self: @TState, settings_id: u32) -> bool;

    fn new_game(ref self: TState, settings_id: u32, to: ContractAddress) -> u256;
    fn add_settings(
        ref self: TState,
        name: felt252,
        description: ByteArray,
        setting_keys: Span<felt252>,
        setting_values: Span<u64>
    );

    // ISRC5
    fn supports_interface(self: @TState, interface_id: felt252) -> bool;
}

#[generate_trait]
pub impl WorldImpl of WorldTrait {
    fn contract_address(self: @WorldStorage, contract_name: @ByteArray) -> ContractAddress {
        match self.dns(contract_name) {
            Option::Some((contract_address, _)) => { (contract_address) },
            Option::None => { (ZERO()) },
        }
    }

    // Create a Store from a dispatcher
    // https://github.com/dojoengine/dojo/blob/main/crates/dojo/core/src/contract/components/world_provider.cairo
    // https://github.com/dojoengine/dojo/blob/main/crates/dojo/core/src/world/storage.cairo
    #[inline(always)]
    fn storage(dispatcher: IWorldDispatcher, namespace: @ByteArray) -> WorldStorage {
        (WorldStorageTrait::new(dispatcher, namespace))
    }
}

