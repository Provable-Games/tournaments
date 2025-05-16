// Enter a tournament that required winning a previous one

use tournaments::achievements::tasks::index::{Task, TaskTrait};
use tournaments::achievements::trophies::interface::{TrophyTrait};
use achievement::types::task::{Task as BushidoTask};

pub impl Qualification of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'QUALIFIED'
    }
    #[inline]
    fn hidden(level: u8) -> bool { false }
    #[inline]
    fn index(level: u8) -> u8 { 0 }
    #[inline]
    fn points(level: u8) -> u16 { 75 }
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
        Task::Qualification.tasks(1)
    }
}