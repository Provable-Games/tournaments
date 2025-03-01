#[starknet::interface]
trait IGameTokenMock<TContractState> {
    fn start_game(ref self: TContractState, game_id: u64);
    fn end_game(ref self: TContractState, game_id: u64, score: u32);
    fn set_settings(
        ref self: TContractState,
        settings_id: u32,
        name: felt252,
        description: ByteArray,
        exists: bool,
    );
    fn score_model_and_attribute(self: @TContractState) -> (felt252, felt252);
}

#[starknet::interface]
trait IGameTokenMockInit<TContractState> {
    fn initializer(ref self: TContractState);
}

#[dojo::contract]
mod game_mock {
    use tournaments::components::interfaces::{ISettings, IGameDetails};
    use tournaments::components::game::game_component;
    use openzeppelin_introspection::src5::SRC5Component;
    use openzeppelin_token::erc721::{ERC721Component, ERC721HooksEmptyImpl};

    use tournaments::components::interfaces::{WorldImpl};
    use tournaments::components::libs::game_store::{Store, StoreTrait};
    use tournaments::components::models::game::{SettingsDetails, Score};

    use tournaments::components::constants::{DEFAULT_NS};

    use starknet::{ContractAddress, contract_address_const};

    component!(path: game_component, storage: game, event: GameEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: ERC721Component, storage: erc721, event: ERC721Event);

    #[abi(embed_v0)]
    impl GameImpl = game_component::GameImpl<ContractState>;
    impl GameInternalImpl = game_component::InternalImpl<ContractState>;

    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        game: game_component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        GameEvent: game_component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        ERC721Event: ERC721Component::Event,
    }

    //*******************************
    fn TOKEN_NAME() -> ByteArray {
        ("Game")
    }
    fn TOKEN_SYMBOL() -> ByteArray {
        ("GAME")
    }
    fn BASE_URI() -> ByteArray {
        ("https://game.io")
    }

    fn GAME_NAME() -> felt252 {
        ('Game Name')
    }
    fn GAME_DESCRIPTION() -> ByteArray {
        ("Game Description")
    }
    fn GAME_DEVELOPER() -> felt252 {
        ('Game Developer')
    }
    fn GAME_PUBLISHER() -> felt252 {
        ('Game Publisher')
    }
    fn GAME_GENRE() -> felt252 {
        ('Game Genre')
    }
    fn GAME_IMAGE() -> ByteArray {
        ("https://game.io/image.png")
    }
    fn GAME_CREATOR() -> ContractAddress {
        contract_address_const::<'GAME CREATOR'>()
    }
    //*******************************

    #[abi(embed_v0)]
    impl SettingsImpl of ISettings<ContractState> {
        fn setting_exists(self: @ContractState, settings_id: u32) -> bool {
            let world = self.world(@DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_settings_details(settings_id).exists
        }
    }

    #[abi(embed_v0)]
    impl GameDetailsImpl of IGameDetails<ContractState> {
        fn score(self: @ContractState, game_id: u64) -> u32 {
            let world = self.world(@DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_score(game_id)
        }
    }

    #[abi(embed_v0)]
    impl GameMockImpl of super::IGameTokenMock<ContractState> {
        fn start_game(ref self: ContractState, game_id: u64) {
            let mut world = self.world(@DEFAULT_NS());
            let mut store: Store = StoreTrait::new(world);

            store.set_score(@Score { game_id, score: 0 });
        }

        fn end_game(ref self: ContractState, game_id: u64, score: u32) {
            let mut world = self.world(@DEFAULT_NS());
            let mut store: Store = StoreTrait::new(world);
            store.set_score(@Score { game_id, score });
        }

        fn set_settings(
            ref self: ContractState,
            settings_id: u32,
            name: felt252,
            description: ByteArray,
            exists: bool,
        ) {
            let mut world = self.world(@DEFAULT_NS());
            let mut store: Store = StoreTrait::new(world);
            store
                .set_settings_details(
                    @SettingsDetails { id: settings_id, name, description, exists: true },
                );
        }

        fn score_model_and_attribute(self: @ContractState) -> (felt252, felt252) {
            ('Score', 'score')
        }
    }

    #[abi(embed_v0)]
    impl GameInitializerImpl of super::IGameTokenMockInit<ContractState> {
        fn initializer(ref self: ContractState) {
            self.erc721.initializer(TOKEN_NAME(), TOKEN_SYMBOL(), BASE_URI());
            self
                .game
                .initializer(
                    GAME_CREATOR(),
                    GAME_NAME(),
                    GAME_DESCRIPTION(),
                    GAME_DEVELOPER(),
                    GAME_PUBLISHER(),
                    GAME_GENRE(),
                    GAME_IMAGE(),
                    DEFAULT_NS(),
                    "Score",
                    "score",
                    "SettingsDetails",
                );
            self.game.set_settings(0, 'Test', "This is a test");
        }
    }
}
