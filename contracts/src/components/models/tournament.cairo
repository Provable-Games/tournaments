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

// TODO: Change this to EntryFeeConfig
// add game_fee to the struct
#[derive(Copy, Drop, Serde, PartialEq, Introspect)]
pub struct EntryFee {
    pub token_address: ContractAddress,
    pub amount: u128,
    pub creator_fee: u8,
    pub distribution: Span<u8>,
}

#[derive(Copy, Drop, Serde, PartialEq, Introspect)]
pub enum EntryRequirement {
    token: ContractAddress,
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
    Scheduled,
    Registration,
    Staging,
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
    pub id: u64,
    pub name: felt252,
    pub description: ByteArray,
    pub creator: ContractAddress,
    pub registration_start_time: u64,
    pub registration_end_time: u64,
    pub start_time: u64,
    pub settings_id: u32,
    pub end_time: u64,
    pub submission_period: u64,
    pub prize_spots: u8,
    pub entry_requirement: Option<EntryRequirement>,
    pub entry_fee: Option<EntryFee>,
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
    pub winner_token_ids: Span<u64>,
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
    pub id: u64,
    pub tournament_id: u64,
    pub payout_position: u8,
    pub token_address: ContractAddress,
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

#[dojo::model]
#[derive(Copy, Drop, Serde, IntrospectPacked)]
pub struct PrizeClaim {
    #[key]
    pub tournament_id: u64,
    #[key]
    pub prize_type: PrizeType,
    pub claimed: bool,
}

#[derive(Copy, Drop, Serde, PartialEq, Introspect)]
pub enum Role {
    TournamentCreator,
    GameCreator,
    Position: u8,
}

#[derive(Copy, Drop, Serde, PartialEq, Introspect)]
pub enum PrizeType {
    EntryFees: Role,
    Sponsored: u64,
}
