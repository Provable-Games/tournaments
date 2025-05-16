// Enter your first tournament
// Enter 10 tournaments
// Enter 20 tournaments

use tournaments::achievements::tasks::index::{Task, TaskTrait};
use tournaments::achievements::trophies::interface::{TrophyTrait};
use achievement::types::task::{Task as BushidoTask};

pub impl Entries of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        match level {
            0 => 'FIRST_STEPS',
            1 => 'SEASONED_COMPETITOR',
            2 => 'VETERAN',
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
        'Entries'
    }

    #[inline]
    fn icon(level: u8) -> felt252 {
        'fa-trophy'
    }

    #[inline]
    fn title(level: u8) -> felt252 {
        match level {
            0 => 'First Steps',
            1 => 'Seasoned Competitor',
            2 => 'Veteran',
            _ => '',
        }
    }

    #[inline]
    fn description(level: u8) -> ByteArray {
        match level {
            0 => "Entered your first tournament",
            1 => "Entered 10 tournaments",
            2 => "Entered 20 tournaments",
            _ => "",
        }
    }

    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        let count: u32 = match level {
            0 => 1,
            1 => 10,
            2 => 20,
            _ => 0,
        };
        Task::Entries.tasks(count)
    }
}