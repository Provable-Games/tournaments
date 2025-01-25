use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, PartialEq, Introspect)]
pub enum TournamentType {
    winners: Span<u64>,
    participants: Span<u64>,
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
    pub token_address: ContractAddress,
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
    Registration,
    Live,
    Submission,
    Finalized,
}

///
/// Model
///

#[dojo::model]
#[derive(Drop, Serde)]
pub struct Tournament {
    #[key]
    pub tournament_id: u64,
    pub name: felt252,
    pub description: ByteArray,
    pub creator: ContractAddress,
    pub registration_start_time: u64,
    pub registration_end_time: u64,
    pub start_time: u64,
    pub settings_id: u32,
    pub end_time: u64,
    pub submission_period: u64,
    pub winners_count: u8,
    pub state: TournamentState,
    pub gated_type: Option<GatedType>,
    pub entry_premium: Option<Premium>,
    pub game_address: ContractAddress,
}

#[dojo::model]
#[derive(Copy, Drop, Serde, IntrospectPacked)]
pub struct Registration {
    #[key]
    pub game_token_id: u64,
    pub tournament_id: u64,
    pub entry_number: u32,
    pub submitted_score: bool,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct TournamentScores {
    #[key]
    pub tournament_id: u64,
    pub top_score_token_ids: Span<u64>,
}

#[dojo::model]
#[derive(Copy, Drop, Serde, IntrospectPacked)]
pub struct PlatformMetrics {
    #[key]
    pub key: felt252,
    pub total_tournaments: u64,
}

#[dojo::model]
#[derive(Copy, Drop, Serde, IntrospectPacked)]
pub struct TournamentTokenMetrics {
    #[key]
    pub key: felt252,
    pub total_supply: u64,
}

#[dojo::model]
#[derive(Copy, Drop, Serde, IntrospectPacked)]
pub struct PrizeMetrics {
    #[key]
    pub key: felt252,
    pub total_prizes: u64,
}

#[dojo::model]
#[derive(Copy, Drop, Serde, IntrospectPacked)]
pub struct EntryCount {
    #[key]
    pub tournament_id: u64,
    pub count: u32,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct Prize {
    #[key]
    pub prize_id: u64,
    pub tournament_id: u64,
    pub payout_position: u8,
    pub claimed: bool,
    pub token: ContractAddress,
    pub token_data_type: TokenDataType,
}


//TODO: Remove name and symbol from the model
#[dojo::model]
#[derive(Drop, Serde)]
pub struct Token {
    #[key]
    pub address: ContractAddress,
    pub name: ByteArray,
    pub symbol: ByteArray,
    pub token_data_type: TokenDataType,
    pub is_registered: bool,
}

#[dojo::model]
#[derive(Copy, Drop, Serde)]
pub struct TournamentConfig {
    #[key]
    pub key: felt252,
    pub safe_mode: bool,
    pub test_mode: bool,
}
