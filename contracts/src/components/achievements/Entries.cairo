// Enter your first tournament
// Enter 10 tournaments
// Enter 20 tournaments

// Create your first tournament
// Create 5 tournaments
// Create 10 tournaments

use darkshuffle::utils::trophies::interface::{BushidoTask, Task, TaskTrait, TrophyTrait};

impl BigHit of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'GAME_MASTER'
    }

    #[inline]
    fn hidden(level: u8) -> bool {
        false
    }

    #[inline]
    fn index(level: u8) -> u8 {
        level
    }

    #[inline]
    fn points(level: u8) -> u16 {
        90
    }

    #[inline]
    fn group() -> felt252 {
        'Game Master'
    }

    #[inline]
    fn icon(level: u8) -> felt252 {
        'fa-trophy-star'
    }

    #[inline]
    fn title(level: u8) -> felt252 {
        'Game Master'
    }

    #[inline]
    fn description(level: u8) -> ByteArray {
        "You're a true master of the game"
    }

    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        let count: u32 = 1;
        Task::CreateTournament.tasks(count)
    }
}