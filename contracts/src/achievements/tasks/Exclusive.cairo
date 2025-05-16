use tournaments::achievements::tasks::interface::TaskTrait;

pub impl Exclusive of TaskTrait {
    #[inline]
    fn identifier() -> felt252 {
        'EXCLUSIVE'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        "Entered a tournament with an allowlist"
    }
}
