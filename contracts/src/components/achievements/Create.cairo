// Create your first tournament
// Create 5 tournaments
// Create 10 tournaments

use darkshuffle::utils::trophies::interface::{BushidoTask, Task, TaskTrait, TrophyTrait};

impl Create of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        match level {
            0 => 'TRAILBLAZER',
            1 => 'EVENT_ARCHITECT',
            2 => 'MASTERMIND',
            _ => '',
        }
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
        match level {
            0 => 50,
            1 => 100,
            2 => 150,
            _ => 0,
        }
    }

    #[inline]
    fn group() -> felt252 {
        'Create'
    }

    #[inline]
    fn icon(level: u8) -> felt252 {
        'fa-trophy-star'
    }

    #[inline]
    fn title(level: u8) -> felt252 {
        match level {
            0 => 'Trailblazer',
            1 => 'Event Architect',
            2 => 'Mastermind',
            _ => '',
        }
    }

    #[inline]
    fn description(level: u8) -> ByteArray {
        match level {
            0 => "Created your first tournament",
            1 => "Created 5 tournaments",
            2 => "Created 20 tournaments",
            _ => "",
        }
    }

    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        let count: u32 = 1;
        Task::CreateTournament.tasks(count)
    }
}