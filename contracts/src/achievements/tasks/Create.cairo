use tournaments::achievements::tasks::interface::TaskTrait;

pub impl Create of TaskTrait {
    #[inline]
    fn identifier() -> felt252 {
        'CREATE'
    }

    #[inline]
    fn description(count: u32) -> ByteArray {
        if count == 1 {
            "Created your first tournament"
        } else if count >= 5 {
            "Created 5 tournaments"
        } else if count >= 20 {
            "Created 20 tournaments"
        } else {
            ""
        }
    }
}
