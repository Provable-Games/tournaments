use tournaments::achievements::tasks::interface::TaskTrait;

pub impl Prizes of TaskTrait {
    #[inline]
    fn identifier() -> felt252 {
        'PRIZES'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        "Added a prize to a tournament"
    }
}
