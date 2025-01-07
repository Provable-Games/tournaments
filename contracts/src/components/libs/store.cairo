use starknet::ContractAddress;
use dojo::world::{WorldStorage};
use dojo::model::{ModelStorage};

use tournaments::components::models::tournament::{
    RegisteredGame, TournamentTotals, Tournament, TournamentEntries, TournamentPrize,
    TournamentScores, Token, TournamentToken, TournamentConfig
};

use tournaments::components::models::game::{
    GameDetails, GameMetadata, Score, Settings, SettingsDetails, GameSettings, GameCount,
    SettingsCount
};

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

    // Tournament

    #[inline(always)]
    fn get_registered_game(ref self: Store, game: ContractAddress) -> RegisteredGame {
        (self.world.read_model(game))
    }

    #[inline(always)]
    fn get_tournament_totals(self: Store, contract: ContractAddress) -> TournamentTotals {
        (self.world.read_model(contract))
    }

    #[inline(always)]
    fn get_tournament(self: Store, tournament_id: u64) -> Tournament {
        (self.world.read_model(tournament_id))
    }

    #[inline(always)]
    fn get_total_entries(self: Store, tournament_id: u64) -> TournamentEntries {
        (self.world.read_model(tournament_id))
    }

    #[inline(always)]
    fn get_tournament_token(self: Store, token_id: u128) -> TournamentToken {
        (self.world.read_model(token_id))
    }

    #[inline(always)]
    fn get_tournament_scores(self: Store, tournament_id: u64) -> TournamentScores {
        (self.world.read_model(tournament_id))
    }

    #[inline(always)]
    fn get_prize(self: Store, tournament_id: u64, prize_key: u64) -> TournamentPrize {
        (self.world.read_model((tournament_id, prize_key),))
    }

    #[inline(always)]
    fn get_token(self: Store, token: ContractAddress) -> Token {
        (self.world.read_model(token))
    }

    #[inline(always)]
    fn get_tournament_config(self: Store, contract: ContractAddress) -> TournamentConfig {
        (self.world.read_model(contract))
    }

    // Game

    #[inline(always)]
    fn get_game(ref self: Store, game: ContractAddress) -> GameDetails {
        (self.world.read_model(game))
    }

    #[inline(always)]
    fn get_game_metadata(ref self: Store, game: ContractAddress) -> GameMetadata {
        (self.world.read_model(game))
    }

    #[inline(always)]
    fn get_game_score(ref self: Store, game_id: u128) -> Score {
        (self.world.read_model(game_id))
    }

    #[inline(always)]
    fn get_game_count(ref self: Store, contract: ContractAddress) -> GameCount {
        (self.world.read_model(contract))
    }

    #[inline(always)]
    fn get_settings_key(ref self: Store, settings_id: u32, key: felt252) -> Settings {
        (self.world.read_model((settings_id, key),))
    }

    #[inline(always)]
    fn get_settings_details(ref self: Store, settings_id: u32) -> SettingsDetails {
        (self.world.read_model(settings_id))
    }

    #[inline(always)]
    fn get_game_settings(ref self: Store, game_id: u128) -> GameSettings {
        (self.world.read_model(game_id))
    }

    #[inline(always)]
    fn get_settings_count(ref self: Store, contract: ContractAddress) -> SettingsCount {
        (self.world.read_model(contract))
    }


    //
    // Setters
    //

    // Tournament

    #[inline(always)]
    fn set_registered_game(ref self: Store, game: @RegisteredGame) {
        self.world.write_model(game);
    }

    #[inline(always)]
    fn set_tournament_totals(ref self: Store, model: @TournamentTotals) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_tournament(ref self: Store, model: @Tournament) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_total_entries(ref self: Store, model: @TournamentEntries) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_tournament_token(ref self: Store, model: @TournamentToken) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_tournament_scores(ref self: Store, model: @TournamentScores) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_prize(ref self: Store, model: @TournamentPrize) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_token(ref self: Store, model: @Token) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_tournament_config(ref self: Store, model: @TournamentConfig) {
        self.world.write_model(model);
    }

    // Game

    #[inline(always)]
    fn set_game(ref self: Store, game: @GameDetails) {
        self.world.write_model(game);
    }

    #[inline(always)]
    fn set_game_metadata(ref self: Store, game: @GameMetadata) {
        self.world.write_model(game);
    }

    #[inline(always)]
    fn set_game_score(ref self: Store, model: @Score) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_game_count(ref self: Store, model: @GameCount) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_settings_key(ref self: Store, model: @Settings) {
        self.world.write_model(model);
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
    fn set_settings_count(ref self: Store, model: @SettingsCount) {
        self.world.write_model(model);
    }
}
