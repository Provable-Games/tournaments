#[starknet::interface]
trait IGameMock<TContractState> {
    fn get_score(self: @TContractState, game_id: u64) -> u64;
    fn start_game(ref self: TContractState, game_id: u64);
    fn end_game(ref self: TContractState, game_id: u64, score: u64);
    fn set_settings(
        ref self: TContractState,
        settings_id: u32,
        name: felt252,
        description: ByteArray,
        exists: bool,
    );
}

#[starknet::interface]
trait IGameMockInit<TContractState> {
    fn initializer(ref self: TContractState);
}

#[dojo::contract]
mod game_mock {
    use tournaments::components::game::game_component;
    use openzeppelin_introspection::src5::SRC5Component;
    use openzeppelin_token::erc721::{ERC721Component, ERC721HooksEmptyImpl};

    use tournaments::components::interfaces::{WorldImpl};
    use tournaments::components::libs::game_store::{Store, StoreTrait};
    use tournaments::components::models::game::{SettingsDetails, Score};

    use tournaments::components::constants::{DEFAULT_NS};

    component!(path: game_component, storage: game, event: GameEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: ERC721Component, storage: erc721, event: ERC721Event);

    #[abi(embed_v0)]
    impl GameImpl = game_component::GameImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;

    impl GameInternalImpl = game_component::InternalImpl<ContractState>;
    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        game: game_component::Storage,
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
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
        ('Game')
    }
    fn GAME_DESCRIPTION() -> ByteArray {
        ("Game description")
    }
    fn GAME_DEVELOPER() -> felt252 {
        ('Game developer')
    }
    fn GAME_PUBLISHER() -> felt252 {
        ('Game publisher')
    }
    fn GAME_GENRE() -> felt252 {
        ('Game genre')
    }
    fn GAME_IMAGE() -> ByteArray {
        ("https://game.io/image.png")
    }
    //*******************************

    #[abi(embed_v0)]
    impl GameMockImpl of super::IGameMock<ContractState> {
        fn start_game(ref self: ContractState, game_id: u64) {
            let mut world = self.world(DEFAULT_NS());
            let mut store: Store = StoreTrait::new(world);

            store.set_score(@Score { game_id, score: 0 });
        }

        fn end_game(ref self: ContractState, game_id: u64, score: u64) {
            let mut world = self.world(DEFAULT_NS());
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
            let mut world = self.world(DEFAULT_NS());
            let mut store: Store = StoreTrait::new(world);
            store
                .set_settings_details(
                    @SettingsDetails { id: settings_id, name, description, exists },
                );
        }

        fn get_score(self: @ContractState, game_id: u64) -> u64 {
            game_id
        }
    }

    #[abi(embed_v0)]
    impl GameInitializerImpl of super::IGameMockInit<ContractState> {
        fn initializer(ref self: ContractState) {
            self.erc721.initializer(TOKEN_NAME(), TOKEN_SYMBOL(), BASE_URI());
            self
                .game
                .initializer(
                    GAME_NAME(),
                    GAME_DESCRIPTION(),
                    GAME_DEVELOPER(),
                    GAME_PUBLISHER(),
                    GAME_GENRE(),
                    GAME_IMAGE(),
                );
        }
    }
}
