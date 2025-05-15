// Enter a tournament that required winning a previous one

use darkshuffle::utils::trophies::interface::{BushidoTask, Task, TaskTrait, TrophyTrait};

impl Qualification of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'QUALIFIED'
    }
    #[inline]
    fn hidden(level: u8) -> bool { false }
    #[inline]
    fn index(level: u8) -> u8 { 0 }
    #[inline]
    fn points(level: u8) -> u16 { 100 }
    #[inline]
    fn group() -> felt252 { 'Qualified' }
    #[inline]
    fn icon(level: u8) -> felt252 { 'fa-certificate' }
    #[inline]
    fn title(level: u8) -> felt252 { 'Qualified' }
    #[inline]
    fn description(level: u8) -> ByteArray { "Enter a tournament that required winning a previous one" }
    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        Task::Qualify.tasks(1)
    }
}