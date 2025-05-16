// Enter a token gated tournament

use tournaments::achievements::tasks::index::{Task, TaskTrait};
use tournaments::achievements::trophies::interface::{TrophyTrait};
use achievement::types::task::{Task as BushidoTask};

pub impl PassHolder of TrophyTrait {
    #[inline]
    fn identifier(level: u8) -> felt252 {
        'PASS_HOLDER'
    }
    #[inline]
    fn hidden(level: u8) -> bool { false }
    #[inline]
    fn index(level: u8) -> u8 { 0 }
    #[inline]
    fn points(level: u8) -> u16 { 100 }
    #[inline]
    fn group() -> felt252 { 'Pass Holder' }
    #[inline]
    fn icon(level: u8) -> felt252 { 'fa-ticket' }
    #[inline]
    fn title(level: u8) -> felt252 { 'Pass Holder' }
    #[inline]
    fn description(level: u8) -> ByteArray { "Enter a token gated tournament" }
    #[inline]
    fn tasks(level: u8) -> Span<BushidoTask> {
        Task::PassHolder.tasks(1)
    }
}