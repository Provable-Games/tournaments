use achievement::store::{StoreTrait};
use dojo::world::{WorldStorage};
use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
use tournaments::achievements::tasks::index::{Task, TaskTrait};

#[generate_trait]
pub impl AchievementsUtilsImpl of AchievementsUtilsTrait {
    fn create_tournament(ref world: WorldStorage) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = get_caller_address().into();
        let time = get_block_timestamp();
        let task_id: felt252 = Task::Create.identifier();
        store.progress(player_id, task_id, count: 1, time: time);
    }

    fn enter_tournament(ref world: WorldStorage) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = get_caller_address().into();
        let time = get_block_timestamp();
        let task_id: felt252 = Task::Entries.identifier();
        store.progress(player_id, task_id, count: 1, time: time);
    }

    fn allowlist_tournament(ref world: WorldStorage) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = get_caller_address().into();
        let time = get_block_timestamp();
        let task_id: felt252 = Task::Exclusive.identifier();
        store.progress(player_id, task_id, count: 1, time: time);
    }

    fn token_gated_tournament(ref world: WorldStorage) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = get_caller_address().into();
        let time = get_block_timestamp();
        let task_id: felt252 = Task::PassHolder.identifier();
        store.progress(player_id, task_id, count: 1, time: time);
    }

    fn qualify_for_tournament(ref world: WorldStorage) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = get_caller_address().into();
        let time = get_block_timestamp();
        let task_id: felt252 = Task::Qualification.identifier();
        store.progress(player_id, task_id, count: 1, time: time);
    }

    fn add_prize(ref world: WorldStorage) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = get_caller_address().into();
        let time = get_block_timestamp();
        let task_id: felt252 = Task::Prizes.identifier();
        store.progress(player_id, task_id, count: 1, time: time);
    }

    fn top_finish(ref world: WorldStorage, player: ContractAddress) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = player.into();
        let time = get_block_timestamp();
        let task_id: felt252 = Task::TopFinish.identifier();
        store.progress(player_id, task_id, count: 1, time: time);
    }
}