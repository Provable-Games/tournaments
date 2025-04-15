use achievement::store::{Store, StoreTrait};
use dojo::model::ModelStorage;
use dojo::world::{IWorldDispatcher, IWorldDispatcherTrait, WorldStorage};
use starknet::{get_block_timestamp, get_caller_address};

#[generate_trait]
impl AchievementsUtilsImpl of AchievementsUtilsTrait {
    fn entries(ref world: WorldStorage) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = get_caller_address().into();
        let time = get_block_timestamp();
        let task_id: felt252 = Task::Entries.identifier();
        store.progress(player_id, task_id, count: 1, time: time);
    }

    fn defeat_enemy(ref world: WorldStorage, battle: Battle, monster_id: u8) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = get_caller_address().into();
        let time = get_block_timestamp();

        let monster_type = MonsterUtilsImpl::get_monster_type(monster_id);
        match monster_type {
            CardType::Hunter => {
                let task_id: felt252 = Task::HuntersProwess.identifier();
                store.progress(player_id, task_id, count: 1, time: time);
            },
            CardType::Brute => {
                let task_id: felt252 = Task::BruteForce.identifier();
                store.progress(player_id, task_id, count: 1, time: time);
            },
            CardType::Magical => {
                let task_id: felt252 = Task::MagicalMayhem.identifier();
                store.progress(player_id, task_id, count: 1, time: time);
            },
            _ => {},
        }
    }

    fn survivor(ref world: WorldStorage) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = get_caller_address().into();
        let time = get_block_timestamp();

        let task_id: felt252 = Task::Survivor.identifier();
        store.progress(player_id, task_id, count: 1, time: time);
    }

    fn big_hit(ref world: WorldStorage) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = get_caller_address().into();
        let time = get_block_timestamp();

        let task_id: felt252 = Task::BigHit.identifier();
        store.progress(player_id, task_id, count: 1, time: time);
    }

    fn heroic(ref world: WorldStorage) {
        let store = StoreTrait::new(world);
        let player_id: felt252 = get_caller_address().into();
        let time = get_block_timestamp();

        let task_id: felt252 = Task::Heroic.identifier();
        store.progress(player_id, task_id, count: 1, time: time);
    }
}