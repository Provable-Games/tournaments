// Add prizes to a tournament

use darkshuffle::utils::trophies::interface::{BushidoTask, Task, TaskTrait, TrophyTrait};

impl Prizes of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'DONATOR'
    }
    #[inline]
    fn hidden(level: u8) -> bool { false }
    #[inline]
    fn index(level: u8) -> u8 { 0 }
    #[inline]
    fn points(level: u8) -> u16 { 150 }
    #[inline]
    fn group() -> felt252 { 'Prizes' }
    #[inline]
    fn icon(level: u8) -> felt252 { 'fa-gift' }
    #[inline]
    fn title(level: u8) -> felt252 { 'Donator' }
    #[inline]
    fn description(level: u8) -> ByteArray { "Added a prize to a tournament" }
    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        Task::AddPrize.tasks(1)
    }
}