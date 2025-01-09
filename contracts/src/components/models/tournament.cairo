use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, PartialEq, Introspect)]
pub enum TournamentType {
    winners: Span<u128>,
    participants: Span<u128>,
}

#[derive(Copy, Drop, Serde, Introspect)]
pub struct ERC20Data {
    pub token_amount: u128,
}

#[derive(Copy, Drop, Serde, Introspect)]
pub struct ERC721Data {
    pub token_id: u128,
}

#[derive(Copy, Drop, Serde, PartialEq, Introspect)]
pub struct Premium {
    pub token: ContractAddress,
    pub token_amount: u128,
    pub token_distribution: Span<u8>,
    pub creator_fee: u8,
}

#[derive(Copy, Drop, Serde, PartialEq, Introspect)]
pub enum GatedType {
    token: ContractAddress,
    // TODO: add enum between winners and participants
    tournament: TournamentType,
    address: Span<ContractAddress>,
}

#[derive(Copy, Drop, Serde, Introspect)]
pub enum TokenDataType {
    erc20: ERC20Data,
    erc721: ERC721Data,
}

#[derive(Copy, Drop, Serde, PartialEq, Introspect)]
pub enum TournamentState {
    PreRegistration,
    Registration,
    Active,
    Finalized,
    Submitted,
}

#[derive(Copy, Drop, Serde, PartialEq, Introspect)]
pub enum TournamentGameState {
    Registered,
    Started,
    Submitted,
}

///
/// Model
///

#[dojo::model]
#[derive(Drop, Serde)]
pub struct Tournament {
    #[key]
    pub tournament_id: u128,
    pub name: felt252,
    pub description: ByteArray,
    pub creator: ContractAddress,
    pub registration_start_time: u64,
    pub registration_end_time: u64,
    pub start_time: u64,
    pub end_time: u64,
    pub submission_period: u64,
    pub winners_count: u8,
    pub gated_type: Option<GatedType>,
    pub entry_premium: Option<Premium>,
    pub game_address: ContractAddress,
    pub settings_id: u32,
    pub state: TournamentState,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct TournamentToken {
    #[key]
    pub token_id: u128,
    pub tournament_id: u128,
    pub game_id: u128,
    pub score: u64,
    pub state: Option<TournamentGameState>,
    pub registration_number: u64
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct TournamentEntries {
    #[key]
    pub tournament_id: u128,
    pub entry_count: u64,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct TournamentScores {
    #[key]
    pub tournament_id: u128,
    pub top_score_ids: Span<u128>,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct TournamentTotals {
    #[key]
    pub contract: ContractAddress,
    pub tournament_count: u128,
    pub prize_count: u128,
    pub token_count: u128,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct TournamentPrize {
    #[key]
    pub prize_key: u128,
    pub tournament_id: u128,
    pub token: ContractAddress,
    pub token_data_type: TokenDataType,
    pub payout_position: u8,
    pub claimed: bool
}

#[dojo::model]
#[derive(Drop, Serde)]
pub struct Token {
    #[key]
    pub token: ContractAddress,
    pub name: ByteArray,
    pub symbol: ByteArray,
    pub token_data_type: TokenDataType,
    pub is_registered: bool,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct TournamentConfig {
    #[key]
    pub contract: ContractAddress,
    pub safe_mode: bool,
    pub test_mode: bool,
}
