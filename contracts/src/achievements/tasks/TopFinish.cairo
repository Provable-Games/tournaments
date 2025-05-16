use tournaments::achievements::tasks::interface::TaskTrait;

pub impl TopFinish of TaskTrait {
    #[inline]
    fn identifier() -> felt252 {
        'TOP_FINISH'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        "Get a score in the winners list of a tournament"
    }
}
