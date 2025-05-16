use tournaments::achievements::tasks::interface::TaskTrait;

pub impl PassHolder of TaskTrait {
    #[inline]
    fn identifier() -> felt252 {
        'PASS_HOLDER'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        "Enter a token gated tournament"
    }
}
