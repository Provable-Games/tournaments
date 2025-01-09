use starknet::ContractAddress;
use dojo::world::{WorldStorage};
use dojo::model::{ModelStorage};

use tournaments::components::models::tournament::{
    TournamentTotals, Tournament, TournamentEntries, TournamentPrize, TournamentScores, Token,
    TournamentToken, TournamentConfig
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
    fn get_prize(self: Store, prize_key: u64) -> TournamentPrize {
        (self.world.read_model(prize_key))
    }

    #[inline(always)]
    fn get_token(self: Store, token: ContractAddress) -> Token {
        (self.world.read_model(token))
    }

    #[inline(always)]
    fn get_tournament_config(self: Store, contract: ContractAddress) -> TournamentConfig {
        (self.world.read_model(contract))
    }

    //
    // Setters
    //

    // Tournament

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
}
