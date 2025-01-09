use starknet::ContractAddress;

use tournaments::components::constants::MIN_SUBMISSION_PERIOD;
use tournaments::tests::{
    constants::{
        TOURNAMENT_NAME, TOURNAMENT_DESCRIPTION, TEST_REGISTRATION_START_TIME,
        TEST_REGISTRATION_END_TIME, TEST_START_TIME, TEST_END_TIME, 
        SETTINGS_NAME, SETTINGS_DESCRIPTION
    },
};
use tournaments::components::tests::interfaces::{
    IERC721MockDispatcher, IERC721MockDispatcherTrait, ITournamentMockDispatcher,
    ITournamentMockDispatcherTrait, IGameMockDispatcher, IGameMockDispatcherTrait
};

//
// Test Helpers
//

pub fn create_basic_tournament(
    tournament: ITournamentMockDispatcher, game: ContractAddress
) -> u256 {
    tournament
        .create_tournament(
            TOURNAMENT_NAME(),
            TOURNAMENT_DESCRIPTION(),
            TEST_REGISTRATION_START_TIME().into(),
            TEST_REGISTRATION_END_TIME().into(),
            TEST_START_TIME().into(),
            TEST_END_TIME().into(),
            MIN_SUBMISSION_PERIOD.into(),
            1, // single top score
            Option::None, // zero gated type
            Option::None, // zero entry premium,
            game,
            1
        )
}

pub fn create_settings_details(
    game: IGameMockDispatcher
) {
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
//             token_data_type: TokenDataType::erc20(ERC20Data { token_amount: 1 })
//         },
//         Token {
//             token: erc721.contract_address,
//             token_data_type: TokenDataType::erc721(ERC721Data { token_id: 1 })
//         },
//     ];

//     erc20.approve(tournament.contract_address, 1);
//     erc721.approve(tournament.contract_address, 1);

//     tournament.register_tokens(tokens);
// }


