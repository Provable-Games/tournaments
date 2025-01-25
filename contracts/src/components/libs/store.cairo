use starknet::ContractAddress;
use dojo::world::{WorldStorage};
use dojo::model::{ModelStorage};

use tournaments::components::models::tournament::{
    Tournament, EntryCount, Prize, TournamentScores, Token, Registration, TournamentConfig,
    TournamentTokenMetrics, PlatformMetrics, PrizeMetrics,
};

use tournaments::components::constants::{VERSION};

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
    fn get_platform_metrics(self: Store, key: felt252) -> PlatformMetrics {
        (self.world.read_model(key))
    }

    #[inline(always)]
    fn get_token_metadata_metrics(self: Store, key: felt252) -> TournamentTokenMetrics {
        (self.world.read_model(key))
    }

    #[inline(always)]
    fn get_prize_metrics(self: Store, key: felt252) -> PrizeMetrics {
        (self.world.read_model(key))
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
    fn get_registration(self: Store, token_id: u64) -> Registration {
        (self.world.read_model(token_id))
    }

    #[inline(always)]
    fn get_tournament_scores(self: Store, tournament_id: u64) -> TournamentScores {
        (self.world.read_model(tournament_id))
    }

    #[inline(always)]
    fn get_prize(self: Store, prize_id: u64) -> Prize {
        (self.world.read_model((prize_id)))
    }

    #[inline(always)]
    fn get_token(self: Store, address: ContractAddress) -> Token {
        (self.world.read_model(address))
    }

    #[inline(always)]
    fn get_tournament_config(self: Store, key: felt252) -> TournamentConfig {
        (self.world.read_model(key))
    }

    //
    // Setters
    //

    // Tournament

    #[inline(always)]
    fn set_tournament(ref self: Store, model: @Tournament) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_tournament_entry_count(ref self: Store, model: @EntryCount) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn increment_and_get_tournament_entry_count(ref self: Store, tournament_id: u64) -> u32 {
        let mut entries = self.get_tournament_entry_count(tournament_id);
        entries.count += 1;
        self.set_tournament_entry_count(@entries);
        entries.count
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
    fn set_prize_metrics(ref self: Store, model: @PrizeMetrics) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn increment_and_get_prize_count(ref self: Store) -> u64 {
        let mut metrics = self.get_prize_metrics(VERSION);
        metrics.total_prizes += 1;
        self.set_prize_metrics(@metrics);
        metrics.total_prizes
    }


    #[inline(always)]
    fn set_token(ref self: Store, model: @Token) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn set_tournament_config(ref self: Store, model: @TournamentConfig) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn increment_and_get_token_supply(ref self: Store) -> u64 {
        let mut metrics = self.get_token_metadata_metrics(VERSION);
        metrics.total_supply += 1;
        self.set_token_metadata_metrics(@metrics);
        metrics.total_supply
    }

    #[inline(always)]
    fn set_token_metadata_metrics(ref self: Store, model: @TournamentTokenMetrics) {
        self.world.write_model(model);
    }

    #[inline(always)]
    fn increment_and_get_tournament_count(ref self: Store) -> u64 {
        let mut platform_metrics = self.get_platform_metrics(VERSION);
        platform_metrics.total_tournaments += 1;
        self.set_platform_metrics(@platform_metrics);
        platform_metrics.total_tournaments
    }

    #[inline(always)]
    fn set_platform_metrics(ref self: Store, model: @PlatformMetrics) {
        self.world.write_model(model);
    }
}
