use starknet::ContractAddress;
use dojo::world::{WorldStorage};
use dojo::model::{ModelStorage};

use tournaments::components::models::game::{
    GameMetadata, SettingsDetails, TokenMetadata, GameCounter, Score,
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
    fn get_game_count(self: Store) -> u64 {
        let game_counter: GameCounter = self.world.read_model(VERSION);
        game_counter.count
    }

    #[inline(always)]
    fn get_settings_details(self: Store, settings_id: u32) -> SettingsDetails {
        (self.world.read_model(settings_id))
    }

    #[inline(always)]
    fn get_token_metadata(self: Store, token_id: u64) -> TokenMetadata {
        (self.world.read_model(token_id))
    }

    fn get_score(self: Store, game_id: u64) -> u32 {
        let score: Score = self.world.read_model(game_id);
        score.score
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
    fn set_game_count(ref self: Store, count: u64) {
        self.world.write_model(@GameCounter { key: VERSION, count: count });
    }

    #[inline(always)]
    fn increment_and_get_game_count(ref self: Store) -> u64 {
        let mut count = self.get_game_count();
        count += 1;
        self.set_game_count(count);
        count
    }

    #[inline(always)]
    fn set_settings_details(ref self: Store, model: @SettingsDetails) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_token_metadata(ref self: Store, model: @TokenMetadata) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_score(ref self: Store, model: @Score) {
        self.world.write_model(model);
    }
}
