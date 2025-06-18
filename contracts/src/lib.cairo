pub mod constants;
pub mod interfaces;
pub mod libs {
    pub mod store;
    pub mod utils;
    pub mod lifecycle;
    pub mod schedule;
}
pub mod models {
    pub mod lifecycle;
    pub mod schedule;
    pub mod budokan;
}

pub mod budokan;

#[cfg(test)]
mod tests {
    pub mod libs {
        pub mod store;
    }
    pub mod mocks {
        pub mod erc20_mock;
        pub mod erc721_mock;
    }
    #[cfg(test)]
    pub mod setup_denshokan;
    #[cfg(test)]
    mod helpers;
    #[cfg(test)]
    mod test_budokan;
    // #[cfg(test)]
    // mod test_budokan_stress_tests;
    pub mod interfaces;
    pub mod constants;
    pub mod utils;
}

