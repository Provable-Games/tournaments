use starknet::ContractAddress;
use dojo::world::IWorldDispatcher;
use tournaments::components::models::tournament::{
    Tournament as TournamentModel, Premium, TokenDataType, GatedType, Registration,
};

#[starknet::interface]
pub trait ITournamentMock<TState> {
    // IWorldProvider
    fn world_dispatcher(self: @TState) -> IWorldDispatcher;

    // IERC721
    fn balance_of(self: @TState, account: ContractAddress) -> u64;
    fn owner_of(self: @TState, token_id: u64) -> ContractAddress;
    fn safe_transfer_from(
        ref self: TState,
        from: ContractAddress,
        to: ContractAddress,
        token_id: u64,
        data: Span<felt252>,
    );
    fn transfer_from(ref self: TState, from: ContractAddress, to: ContractAddress, token_id: u64);
    fn approve(ref self: TState, to: ContractAddress, token_id: u64);
    fn set_approval_for_all(ref self: TState, operator: ContractAddress, approved: bool);
    fn get_approved(self: @TState, token_id: u64) -> ContractAddress;
    fn is_approved_for_all(
        self: @TState, owner: ContractAddress, operator: ContractAddress,
    ) -> bool;

    // ITournament
    fn total_tournaments(self: @TState) -> u64;
    fn tournament(self: @TState, tournament_id: u64) -> TournamentModel;
    fn get_registration(self: @TState, token_id: u64) -> Registration;
    fn tournament_entries(self: @TState, tournament_id: u64) -> u64;
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
        winners_count: u8,
        gated_type: Option<GatedType>,
        entry_premium: Option<Premium>,
        game_address: ContractAddress,
        settings_id: u32,
    ) -> u64;
    fn enter_tournament(
        ref self: TState,
        tournament_id: u64,
        name: felt252,
        player_address: ContractAddress,
        qualifying_token_id: Option<u64>,
    ) -> (u64, u32);
    fn start_game(ref self: TState, tournament_token_id: u64);
    fn submit_scores(ref self: TState, tournament_id: u64, token_ids: Array<u64>);
    fn distribute_prize(ref self: TState, prize_id: u64);
    fn distribute_unclaimable_prize(ref self: TState, prize_id: u64);
    fn add_prize(
        ref self: TState,
        tournament_id: u64,
        token: ContractAddress,
        token_data_type: TokenDataType,
        position: u8,
    ) -> u64;

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

#[starknet::interface]
trait ITournamentMockInit<TState> {
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
pub mod tournament_mock {
    use starknet::ContractAddress;
    use tournaments::components::tournament::tournament_component;
    use openzeppelin_introspection::src5::SRC5Component;
    use openzeppelin_token::erc721::{ERC721Component, ERC721HooksEmptyImpl};

    component!(path: tournament_component, storage: tournament, event: TournamentEvent);
    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    impl TournamentImpl = tournament_component::TournamentImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;

    impl TournamentInternalImpl = tournament_component::InternalImpl<ContractState>;

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

    #[abi(embed_v0)]
    impl TournamentInitializerImpl of super::ITournamentMockInit<ContractState> {
        fn initializer(
            ref self: ContractState,
            name: ByteArray,
            symbol: ByteArray,
            base_uri: ByteArray,
            safe_mode: bool,
            test_mode: bool,
            test_erc20: ContractAddress,
            test_erc721: ContractAddress,
        ) {
            self.tournament.initialize(name, symbol, base_uri, safe_mode, test_mode);
            self.tournament.initialize_erc20(test_erc20, "Test ERC20", "TERC20");
            self.tournament.initialize_erc721(test_erc721, "Test ERC721", "TERC721");
        }
    }
}
