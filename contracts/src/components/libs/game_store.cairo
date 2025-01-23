use starknet::ContractAddress;
use dojo::world::{WorldStorage};
use dojo::model::{ModelStorage};

use tournaments::components::models::game::{
    GameMetadata, SettingsDetails, GameSettings, GameCount, Score,
};

use tournaments::components::game::game_component::{VERSION};

#[derive(Copy, Drop)]
pub struct Store {
    world: WorldStorage,
}

#[generate_trait]
pub impl StoreImpl of StoreTrait {
    #[inline(always)]
    fn new(world: WorldStorage) -> Store {
        (Store { world })
    }

    //
    // Getters
    //

    // Game

    #[inline(always)]
    fn get_game_metadata(self: Store, game: ContractAddress) -> GameMetadata {
        (self.world.read_model(game))
    }


    #[inline(always)]
    fn get_game_count(self: Store) -> GameCount {
        (self.world.read_model(VERSION))
    }

    #[inline(always)]
    fn get_settings_details(self: Store, settings_id: u32) -> SettingsDetails {
        (self.world.read_model(settings_id))
    }

    #[inline(always)]
    fn get_game_settings(self: Store, token_id: u64) -> GameSettings {
        (self.world.read_model(token_id))
    }

    fn get_score(self: Store, game_id: u64) -> Score {
        (self.world.read_model(game_id))
    }

    //
    // Setters
    //

    // Game

    #[inline(always)]
    fn set_game_metadata(ref self: Store, game: @GameMetadata) {
        self.world.write_model(game);
    }

    #[inline(always)]
    fn set_game_count(ref self: Store, model: @GameCount) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn increment_and_get_game_count(ref self: Store) -> u64 {
        let mut count = self.get_game_count();
        count.count += 1;
        self.set_game_count(@count);
        count.count
    }

    #[inline(always)]
    fn set_settings_details(ref self: Store, model: @SettingsDetails) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_game_settings(ref self: Store, model: @GameSettings) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_score(ref self: Store, model: @Score) {
        self.world.write_model(model);
    }
}
