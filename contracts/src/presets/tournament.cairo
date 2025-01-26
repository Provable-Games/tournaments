use starknet::ContractAddress;
use dojo::world::IWorldDispatcher;
use tournaments::components::models::tournament::{
    Tournament as TournamentModel, EntryFee, TokenDataType, EntryRequirement, PrizeType,
    TournamentState,
};

#[starknet::interface]
pub trait ITournament<TState> {
    // IWorldProvider
    fn world_dispatcher(self: @TState) -> IWorldDispatcher;

    fn total_tournaments(self: @TState) -> u64;
    fn tournament(self: @TState, tournament_id: u64) -> TournamentModel;
    fn tournament_entries(self: @TState, tournament_id: u64) -> u64;
    fn tournament_winners(self: @TState, tournament_id: u64) -> Span<u64>;
    fn tournament_state(self: @TState, tournament_id: u64) -> TournamentState;
    fn top_scores(self: @TState, tournament_id: u64) -> Array<u64>;
    fn is_token_registered(self: @TState, token: ContractAddress) -> bool;
    // TODO: add for V2 (only ERC721 tokens)
    // fn register_tokens(ref self: TState, tokens: Array<Token>);
    fn create_tournament(
        ref self: TState,
        name: felt252,
        description: ByteArray,
        registration_start_time: u64,
        registration_end_time: u64,
        start_time: u64,
        end_time: u64,
        submission_period: u64,
        prize_spots: u8,
        entry_requirement: Option<EntryRequirement>,
        entry_fee: Option<EntryFee>,
        game_address: ContractAddress,
        settings_id: u32,
    ) -> u64;
    fn enter_tournament(
        ref self: TState,
        tournament_id: u64,
        name: felt252,
        player_address: ContractAddress,
        qualifying_token_id: Option<u256>,
    ) -> (u64, u32);
    fn submit_scores(ref self: TState, tournament_id: u64, token_ids: Array<u64>);
    fn claim_prize(ref self: TState, tournament_id: u64, prize_type: PrizeType);
    fn add_prize(
        ref self: TState,
        tournament_id: u64,
        token_address: ContractAddress,
        token_data_type: TokenDataType,
        position: u8,
    );

    fn initializer(
        ref self: TState,
        name: ByteArray,
        symbol: ByteArray,
        base_uri: ByteArray,
        safe_mode: bool,
        test_mode: bool,
        test_erc20: ContractAddress,
        test_erc721: ContractAddress,
    );
}

#[dojo::contract]
pub mod Tournament {
    use starknet::{contract_address_const};
    use tournaments::components::tournament::tournament_component;
    use openzeppelin_introspection::src5::SRC5Component;
    use openzeppelin_token::erc721::{ERC721Component, ERC721HooksEmptyImpl};

    component!(path: tournament_component, storage: tournament, event: TournamentEvent);
    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    impl TournamentComponentImpl =
        tournament_component::TournamentImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;

    impl TournamentComponentInternalImpl = tournament_component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        tournament: tournament_component::Storage,
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        TournamentEvent: tournament_component::Event,
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    fn dojo_init(
        ref self: ContractState,
        name: ByteArray,
        symbol: ByteArray,
        base_uri: ByteArray,
        safe_mode: bool,
        test_mode: bool,
    ) {
        self.tournament.initialize(name, symbol, base_uri, safe_mode, test_mode);
        self
            .tournament
            .initialize_erc20(
                contract_address_const::<
                    0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7,
                >(),
                "Ether",
                "ETH",
            );
        self
            .tournament
            .initialize_erc20(
                contract_address_const::<
                    0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49,
                >(),
                "Lords",
                "LORDS",
            );
        self
            .tournament
            .initialize_erc721(
                contract_address_const::<
                    0x018108b32cea514a78ef1b0e4a0753e855cdf620bc0565202c02456f618c4dc4,
                >(),
                "Loot Survivor",
                "LSVR",
            );
        self
            .tournament
            .initialize_erc20(
                contract_address_const::<
                    0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d,
                >(),
                "Starknet Token",
                "STRK",
            );
        self
            .tournament
            .initialize_erc20(
                contract_address_const::<
                    0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8,
                >(),
                "USD Coin",
                "USDC",
            );
        self
            .tournament
            .initialize_erc20(
                contract_address_const::<
                    0x4878d1148318a31829523ee9c6a5ee563af6cd87f90a30809e5b0d27db8a9b,
                >(),
                "Standard Weighted Adalian Yield",
                "SWAY",
            );
        self
            .tournament
            .initialize_erc20(
                contract_address_const::<
                    0x410466536b5ae074f7fea81e5533b8134a9fa08b3dd077dd9db08f64997d113,
                >(),
                "Paper",
                "PAPER",
            );
        self
            .tournament
            .initialize_erc20(
                contract_address_const::<
                    0x75afe6402ad5a5c20dd25e10ec3b3986acaa647b77e4ae24b0cbc9a54a27a87,
                >(),
                "Ekubo Protocol",
                "EKUBO",
            );
        self
            .tournament
            .initialize_erc20(
                contract_address_const::<
                    0x3b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee,
                >(),
                "STARKNET BROTHER",
                "BROTHER",
            );
        self
            .tournament
            .initialize_erc721(
                contract_address_const::<
                    0x00539f522b29ae9251dbf7443c7a950cf260372e69efab3710a11bf17a9599f1,
                >(),
                "Blobert",
                "BLOB",
            );
        self
            .tournament
            .initialize_erc721(
                contract_address_const::<
                    0x0158160018d590d93528995b340260e65aedd76d28a686e9daa5c4e8fad0c5dd,
                >(),
                "Beasts",
                "BEASTS",
            );
    }
}
