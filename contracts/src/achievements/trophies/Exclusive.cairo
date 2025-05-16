// Enter an exclusive tournament

use tournaments::achievements::tasks::index::{Task, TaskTrait};
use tournaments::achievements::trophies::interface::{TrophyTrait};
use achievement::types::task::{Task as BushidoTask};

pub impl Exclusive of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'VIP'
    }
    #[inline]
    fn hidden(level: u8) -> bool { false }
    #[inline]
    fn index(level: u8) -> u8 { 0 }
    #[inline]
    fn points(level: u8) -> u16 { 75 }
    #[inline]
    fn group() -> felt252 { 'Exclusive' }
    #[inline]
    fn icon(level: u8) -> felt252 { 'fa-star' }
    #[inline]
    fn title(level: u8) -> felt252 { 'VIP' }
    #[inline]
    fn description(level: u8) -> ByteArray { "Entered a tournament with an allowlist" }
    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        Task::Exclusive.tasks(1)
    }
}