use tournaments::achievements::tasks::interface::TaskTrait;

pub impl Qualification of TaskTrait {
    #[inline]
    fn identifier() -> felt252 {
        'QUALIFIED'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        "Enter a tournament that required winning a previous one"
    }
}
