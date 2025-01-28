use starknet::ContractAddress;

use tournaments::components::constants::{
    MIN_REGISTRATION_PERIOD, MAX_REGISTRATION_PERIOD, MIN_SUBMISSION_PERIOD, MAX_TOURNAMENT_LENGTH,
};
use tournaments::tests::{
    constants::{
        TOURNAMENT_NAME, TOURNAMENT_DESCRIPTION, TEST_REGISTRATION_START_TIME,
        TEST_REGISTRATION_END_TIME, TEST_START_TIME, TEST_END_TIME, SETTINGS_NAME,
        SETTINGS_DESCRIPTION,
    },
};
use tournaments::components::tests::interfaces::{
    ITournamentMockDispatcher, ITournamentMockDispatcherTrait, IGameMockDispatcher,
    IGameMockDispatcherTrait,
};

use tournaments::components::models::tournament::{
    Tournament, Metadata, GameConfig, Schedule, Period,
};

//
// Test Helpers
//
pub fn test_metadata() -> Metadata {
    Metadata { name: TOURNAMENT_NAME(), description: TOURNAMENT_DESCRIPTION() }
}

pub fn test_game_config(game_address: ContractAddress) -> GameConfig {
    GameConfig { address: game_address, settings_id: 1, prize_spots: 1 }
}

// pub struct Schedule {
//     pub registration: Option<Period>,
//     pub game: Period,
//     pub submission_period: u64,
// }

pub fn test_schedule() -> Schedule {
    Schedule {
        registration: Option::Some(test_registration_period()),
        game: test_game_period(),
        submission_period: MIN_SUBMISSION_PERIOD.into(),
    }
}

pub fn test_season_schedule() -> Schedule {
    Schedule {
        registration: Option::None,
        game: test_game_period(),
        submission_period: MIN_SUBMISSION_PERIOD.into(),
    }
}

pub fn custom_schedule(
    registration: Option<Period>, game: Period, submission_period: u64,
) -> Schedule {
    Schedule { registration, game, submission_period }
}

pub fn start_time_too_soon() -> Period {
    Period { start: 0, end: TEST_REGISTRATION_END_TIME().into() }
}

pub fn tournament_too_long() -> Schedule {
    custom_schedule(
        Option::None,
        Period {
            start: TEST_REGISTRATION_START_TIME().into(),
            end: TEST_REGISTRATION_START_TIME().into() + MAX_TOURNAMENT_LENGTH.into() + 1,
        },
        MIN_SUBMISSION_PERIOD.into(),
    )
}

pub fn registration_period_too_short() -> Period {
    Period {
        start: TEST_REGISTRATION_START_TIME().into(),
        end: TEST_REGISTRATION_START_TIME().into() + MIN_REGISTRATION_PERIOD.into() - 1,
    }
}

pub fn registration_period_too_long() -> Period {
    Period {
        start: TEST_REGISTRATION_START_TIME().into(),
        end: TEST_REGISTRATION_START_TIME().into() + MAX_REGISTRATION_PERIOD.into() + 1,
    }
}

pub fn test_registration_period() -> Period {
    Period {
        start: TEST_REGISTRATION_START_TIME().into(), end: TEST_REGISTRATION_END_TIME().into(),
    }
}

pub fn test_game_period() -> Period {
    Period { start: TEST_START_TIME().into(), end: TEST_END_TIME().into() }
}

pub fn registration_open_beyond_tournament_end() -> Schedule {
    let tournament_period = Period { start: TEST_START_TIME().into(), end: TEST_END_TIME().into() };

    let registration_period = Period {
        start: TEST_REGISTRATION_START_TIME().into(), end: TEST_END_TIME().into() + 1,
    };

    custom_schedule(
        Option::Some(registration_period), tournament_period, MIN_SUBMISSION_PERIOD.into(),
    )
}

pub fn create_basic_tournament(
    tournament: ITournamentMockDispatcher, game: ContractAddress,
) -> (Tournament, u64) {
    tournament
        .create_tournament(test_metadata(), test_schedule(), test_game_config(game), Option::None)
}

pub fn create_settings_details(game: IGameMockDispatcher) {
    game.set_settings(1, SETTINGS_NAME(), SETTINGS_DESCRIPTION(), true);
}
// pub fn register_tokens_for_test(
//     tournament: ITournamentMockDispatcher,
//     erc20: IERC20MockDispatcher,
//     erc721: IERC721MockDispatcher,
// ) {
//     let tokens = array![
//         Token {
//             token: erc20.contract_address,
//             token_type: TokenType::erc20(ERC20Data { amount: 1 })
//         },
//         Token {
//             token: erc721.contract_address,
//             token_type: TokenType::erc721(ERC721Data { id: 1 })
//         },
//     ];

//     erc20.approve(tournament.contract_address, 1);
//     erc721.approve(tournament.contract_address, 1);

//     tournament.register_tokens(tokens);
// }


