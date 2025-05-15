// Finish in the top 3 of a tournament

use darkshuffle::utils::trophies::interface::{BushidoTask, Task, TaskTrait, TrophyTrait};

impl TopFinish of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'ON_THE_PODIUM'
    }
    #[inline]
    fn hidden(level: u8) -> bool { false }
    #[inline]
    fn index(level: u8) -> u8 { 0 }
    #[inline]
    fn points(level: u8) -> u16 { 150 }
    #[inline]
    fn group() -> felt252 { 'Top Finish' }
    #[inline]
    fn icon(level: u8) -> felt252 { 'fa-medal' }
    #[inline]
    fn title(level: u8) -> felt252 { 'On The Podium' }
    #[inline]
    fn description(level: u8) -> ByteArray { "Get a score in the winners list of a tournament" }
    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        Task::Top3Finish.tasks(1)
    }
}