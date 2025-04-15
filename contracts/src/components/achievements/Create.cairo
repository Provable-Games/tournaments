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
        50
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
        match level {
            1 => "Create your first tournament",
            2 => "Create 5 tournaments",
            3 => "Create 10 tournaments",
            _ => "Create 10 tournaments",
        }
    }

    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        let count: u32 = 1;
        Task::CreateTournament.tasks(count)
    }
}