pub mod components {
    pub mod constants;
    pub mod interfaces;
    pub mod game;
    pub mod libs {
        pub mod store;
        pub mod game_store;
        pub mod utils;
        pub mod lifecycle;
        pub mod schedule;
    }
    pub mod models {
        pub mod game;
        pub mod lifecycle;
        pub mod schedule;
        pub mod tournament;
    }
    pub mod tournament;
    pub mod tests {
        pub mod libs {
            pub mod store;
        }
        pub mod mocks {
            pub mod erc20_mock;
            pub mod erc721_mock;
            pub mod game_mock;
            pub mod tournament_mock;
        }
        #[cfg(test)]
        mod helpers;
        #[cfg(test)]
        mod test_tournament;
        pub mod interfaces;
        // #[cfg(test)]
    // mod test_tournament_stress_tests;
    }
}

mod presets {
    pub mod tournament;
}

pub mod achievements {
    pub mod achievements;
    pub mod tasks {
        pub mod Create;
        pub mod Entries;
        pub mod Exclusive;
        pub mod PassHolder;
        pub mod Prizes;
        pub mod Qualification;
        pub mod TopFinish;
        pub mod index;
        pub mod interface;
    }
    pub mod trophies {
        pub mod Create;
        pub mod Entries;
        pub mod Exclusive;
        pub mod PassHolder;
        pub mod Prizes;
        pub mod Qualification;
        pub mod TopFinish;
        pub mod index;
        pub mod interface;
    }
}

#[cfg(test)]
mod tests {
    pub mod constants;
    pub mod utils;
}

