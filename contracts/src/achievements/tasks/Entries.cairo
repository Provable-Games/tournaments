use tournaments::achievements::tasks::interface::TaskTrait;

pub impl Entries of TaskTrait {
    #[inline]
    fn identifier() -> felt252 {
        'ENTRIES'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        if count == 1 {
            "Entered your first tournament"
        } else if count >= 10 {
            "Entered 10 tournaments"
        } else if count >= 20 {
            "Entered 20 tournaments"
        } else {
            ""
        }
    }
}
