use dojo::world::IWorldDispatcher;
use starknet::ContractAddress;
use tournaments::components::models::schedule::{Phase, Schedule};
use tournaments::components::models::tournament::{
    EntryFee, EntryRequirement, GameConfig, Metadata, PrizeType, QualificationProof, TokenType,
    Tournament as TournamentModel,
};

#[starknet::interface]
pub trait ITournament<TState> {
    fn world_dispatcher(self: @TState) -> IWorldDispatcher;

    fn total_tournaments(self: @TState) -> u64;
    fn tournament(self: @TState, tournament_id: u64) -> TournamentModel;
    fn tournament_entries(self: @TState, tournament_id: u64) -> u64;
    fn get_leaderboard(self: @TState, tournament_id: u64) -> Array<u64>;
    fn current_phase(self: @TState, tournament_id: u64) -> Phase;
    fn top_scores(self: @TState, tournament_id: u64) -> Array<u64>;
    fn is_token_registered(self: @TState, token: ContractAddress) -> bool;
    // TODO: add for V2 (only ERC721 tokens)
    // fn register_tokens(ref self: TState, tokens: Array<Token>);
    fn create_tournament(
        ref self: TState,
        creator_rewards_address: ContractAddress,
        metadata: Metadata,
        schedule: Schedule,
        game_config: GameConfig,
        entry_fee: Option<EntryFee>,
        entry_requirement: Option<EntryRequirement>,
    ) -> TournamentModel;
    fn enter_tournament(
        ref self: TState,
        tournament_id: u64,
        player_name: felt252,
        player_address: ContractAddress,
        qualification: Option<QualificationProof>,
    ) -> (u64, u32);
    fn submit_score(ref self: TState, tournament_id: u64, token_id: u64, position: u8);
    fn claim_prize(ref self: TState, tournament_id: u64, prize_type: PrizeType);
    fn add_prize(
        ref self: TState,
        tournament_id: u64,
        token_address: ContractAddress,
        token_type: TokenType,
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
pub mod Budokan {
    use starknet::{contract_address_const};
    use tournaments::components::tournament::tournament_component;
    use tournaments::components::constants::{MAINNET_CHAIN_ID, DEFAULT_NS};
    use dojo::world::{WorldStorage};

    use achievement::components::achievable::AchievableComponent;
    use tournaments::achievements::trophies::index::{Trophy, TrophyTrait, TROPHY_COUNT};

    component!(path: tournament_component, storage: tournament, event: TournamentEvent);
    #[abi(embed_v0)]
    impl TournamentComponentImpl =
        tournament_component::TournamentImpl<ContractState>;
    impl TournamentComponentInternalImpl = tournament_component::InternalImpl<ContractState>;

    component!(path: AchievableComponent, storage: achievable, event: AchievableEvent);
    impl AchievableInternalImpl = AchievableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        tournament: tournament_component::Storage,
        #[substorage(v0)]
        achievable: AchievableComponent::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        TournamentEvent: tournament_component::Event,
        #[flat]
        AchievableEvent: AchievableComponent::Event,
    }

    fn dojo_init(ref self: ContractState, safe_mode: bool, test_mode: bool) {
        let mut world: WorldStorage = self.world(@DEFAULT_NS());

        self.tournament.initialize(safe_mode, test_mode);
        let chain_id = starknet::get_tx_info().unbox().chain_id;
        if chain_id == MAINNET_CHAIN_ID {
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
            self
                .tournament
                .initialize_erc20(
                    contract_address_const::<
                        0x498edfaf50ca5855666a700c25dd629d577eb9afccdf3b5977aec79aee55ada,
                    >(),
                    "Cash",
                    "CASH",
                );
            self
                .tournament
                .initialize_erc20(
                    contract_address_const::<
                        0x0264be95a4a2ace20add68cb321acdccd2f9f8440ee1c7abd85da44ddab01085,
                    >(),
                    "Donkey",
                    "DONKEY",
                );
            self
                .tournament
                .initialize_erc721(
                    contract_address_const::<
                        0x060e8836acbebb535dfcd237ff01f20be503aae407b67bb6e3b5869afae97156,
                    >(),
                    "Eternum Season 1 Pass",
                    "ESP1",
                );
        }

        // [Event] Emit all Trophy events
        let mut trophy_id: u8 = TROPHY_COUNT;
        while trophy_id > 0 {
            let trophy: Trophy = trophy_id.into();
            self
                .achievable
                .create(
                    world,
                    id: trophy.identifier(),
                    hidden: trophy.hidden(),
                    index: trophy.index(),
                    points: trophy.points(),
                    start: trophy.start(),
                    end: trophy.end(),
                    group: trophy.group(),
                    icon: trophy.icon(),
                    title: trophy.title(),
                    description: trophy.description(),
                    tasks: trophy.tasks(),
                    data: trophy.data(),
                );
            trophy_id -= 1;
        }
    }
}
