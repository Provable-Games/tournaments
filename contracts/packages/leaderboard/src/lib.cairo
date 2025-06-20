// SPDX-License-Identifier: BUSL-1.1

pub mod models {
    pub mod leaderboard;
}

pub mod libs {
    pub mod leaderboard;
}

pub mod presets {
    pub mod leaderboard;
}

pub mod interfaces;

#[cfg(test)]
mod tests {
    mod test_leaderboard;
}
