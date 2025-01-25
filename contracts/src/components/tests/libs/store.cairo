use starknet::ContractAddress;
use dojo::world::{WorldStorage};
use dojo::model::{ModelStorage};

use tournaments::components::models::tournament::{
    Tournament, EntryCount, Prize, TournamentScores, Token, Registration, TournamentConfig,
    PlatformMetrics, PrizeMetrics, TournamentTokenMetrics,
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
    fn get_platform_metrics(self: Store, contract: ContractAddress) -> PlatformMetrics {
        (self.world.read_model(contract))
    }

    #[inline(always)]
    fn get_prize_metrics(self: Store, contract: ContractAddress) -> PrizeMetrics {
        (self.world.read_model(contract))
    }

    #[inline(always)]
    fn get_tournament_token_metrics(
        self: Store, contract: ContractAddress,
    ) -> TournamentTokenMetrics {
        (self.world.read_model(contract))
    }

    #[inline(always)]
    fn get_tournament(self: Store, tournament_id: u64) -> Tournament {
        (self.world.read_model(tournament_id))
    }

    #[inline(always)]
    fn get_tournament_entry_count(self: Store, tournament_id: u64) -> EntryCount {
        (self.world.read_model(tournament_id))
    }

    #[inline(always)]
    fn get_registration(self: Store, token_id: u128) -> Registration {
        (self.world.read_model(token_id))
    }

    #[inline(always)]
    fn get_tournament_scores(self: Store, tournament_id: u64) -> TournamentScores {
        (self.world.read_model(tournament_id))
    }

    #[inline(always)]
    fn get_prize(self: Store, prize_id: u64) -> Prize {
        (self.world.read_model(prize_id))
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
    fn set_platform_metrics(ref self: Store, model: @PlatformMetrics) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_tournament(ref self: Store, model: @Tournament) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_tournament_entry_count(ref self: Store, model: @EntryCount) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_registration(ref self: Store, model: @Registration) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_tournament_scores(ref self: Store, model: @TournamentScores) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_prize(ref self: Store, model: @Prize) {
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
