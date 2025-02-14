use starknet::ContractAddress;
use tournaments::components::models::game::{TokenMetadata, GameMetadata};

// TODO: Move to interface file
#[starknet::interface]
pub trait ISettings<TState> {
    fn setting_exists(self: @TState, settings_id: u32) -> bool;
}

// TODO: Move to interface file
#[starknet::interface]
pub trait IGameDetails<TState> {
    fn score(self: @TState, game_id: u64) -> u32;
}

// TODO: Move to interface file
#[starknet::interface]
pub trait IGame<TState> {
    fn mint(
        ref self: TState,
        player_name: felt252,
        settings_id: u32,
        start: Option<u64>,
        end: Option<u64>,
        to: ContractAddress,
    ) -> u64;
    fn game_metadata(self: @TState) -> GameMetadata;
    fn token_metadata(self: @TState, token_id: u64) -> TokenMetadata;
    fn game_count(self: @TState) -> u64;
    fn namespace(self: @TState) -> ByteArray;
}

///
/// Game Component
///
#[starknet::component]
pub mod game_component {
    use super::{IGame, ISettings, IGameDetails};
    use starknet::{ContractAddress, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess};
    use dojo::contract::components::world_provider::{IWorldProvider};

    use tournaments::components::models::game::{GameMetadata, TokenMetadata, SettingsDetails};
    use tournaments::components::models::lifecycle::Lifecycle;
    use tournaments::components::interfaces::{WorldTrait, WorldImpl, IGAME_ID, IGAME_METADATA_ID};
    use tournaments::components::libs::game_store::{Store, StoreTrait};
    use openzeppelin_introspection::src5::SRC5Component;
    use openzeppelin_introspection::src5::SRC5Component::InternalTrait as SRC5InternalTrait;
    use openzeppelin_introspection::src5::SRC5Component::SRC5Impl;
    use openzeppelin_token::erc721::{
        ERC721Component, ERC721Component::{InternalImpl as ERC721InternalImpl},
        interface::{IERC721_ID, IERC721_METADATA_ID},
    };

    #[storage]
    pub struct Storage {
        _namespace: ByteArray,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {}

    mod Errors {
        const CALLER_IS_NOT_OWNER: felt252 = 'ERC721: caller is not owner';
    }

    pub const VERSION: felt252 = '0.0.1';

    #[embeddable_as(GameImpl)]
    impl Game<
        TContractState,
        +HasComponent<TContractState>,
        +IWorldProvider<TContractState>,
        +ERC721Component::ERC721HooksTrait<TContractState>,
        +ISettings<TContractState>,
        +IGameDetails<TContractState>,
        impl SRC5: SRC5Component::HasComponent<TContractState>,
        impl ERC721: ERC721Component::HasComponent<TContractState>,
        +Drop<TContractState>,
    > of IGame<ComponentState<TContractState>> {
        fn mint(
            ref self: ComponentState<TContractState>,
            player_name: felt252,
            settings_id: u32,
            start: Option<u64>,
            end: Option<u64>,
            to: ContractAddress,
        ) -> u64 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), self.get_namespace(),
            );
            let mut store: Store = StoreTrait::new(world);

            // verify settings exist
            self.assert_setting_exists(settings_id);

            // mint game token
            let token_id = self.mint_game(ref store, to);

            // get block timestamp and caller address
            let lifecycle = Lifecycle { mint: starknet::get_block_timestamp(), start, end };

            let minted_by = starknet::get_caller_address();

            store
                .set_token_metadata(
                    @TokenMetadata { token_id, minted_by, player_name, settings_id, lifecycle },
                );

            token_id
        }

        fn game_metadata(self: @ComponentState<TContractState>) -> GameMetadata {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), self.get_namespace(),
            );
            let store: Store = StoreTrait::new(world);
            store.get_game_metadata(get_contract_address())
        }

        fn token_metadata(self: @ComponentState<TContractState>, token_id: u64) -> TokenMetadata {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), self.get_namespace(),
            );
            let store: Store = StoreTrait::new(world);
            store.get_token_metadata(token_id)
        }

        fn game_count(self: @ComponentState<TContractState>) -> u64 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), self.get_namespace(),
            );
            let store: Store = StoreTrait::new(world);
            store.get_game_count()
        }

        fn namespace(self: @ComponentState<TContractState>) -> ByteArray {
            self._namespace.read()
        }
    }
    #[generate_trait]
    pub impl InternalImpl<
        TContractState,
        +HasComponent<TContractState>,
        +IWorldProvider<TContractState>,
        +ERC721Component::ERC721HooksTrait<TContractState>,
        +ISettings<TContractState>,
        impl ERC721: ERC721Component::HasComponent<TContractState>,
        impl SRC5: SRC5Component::HasComponent<TContractState>,
        +Drop<TContractState>,
    > of InternalTrait<TContractState> {
        fn initializer(
            ref self: ComponentState<TContractState>,
            creator_address: ContractAddress,
            name: felt252,
            description: ByteArray,
            developer: felt252,
            publisher: felt252,
            genre: felt252,
            image: ByteArray,
            namespace: ByteArray,
        ) {
            let mut world = WorldTrait::storage(self.get_contract().world_dispatcher(), @namespace);
            let mut store: Store = StoreTrait::new(world);
            let game_metadata = @GameMetadata {
                contract_address: get_contract_address(),
                creator_address,
                name,
                description,
                developer,
                publisher,
                genre,
                image,
            };
            store.set_game_metadata(game_metadata);
            self.mint_creator_token(ref store, creator_address);
            self.register_src5_interfaces();
            self._namespace.write(namespace);
        }

        fn register_src5_interfaces(ref self: ComponentState<TContractState>) {
            let mut src5_component = get_dep_component_mut!(ref self, SRC5);
            src5_component.register_interface(IGAME_ID);
            src5_component.register_interface(IGAME_METADATA_ID);
            src5_component.register_interface(IERC721_ID);
            src5_component.register_interface(IERC721_METADATA_ID);
        }

        fn mint_creator_token(
            ref self: ComponentState<TContractState>, ref store: Store, to: ContractAddress,
        ) {
            let token_id = 0;
            let minted_by = get_contract_address();
            let player_name = 'Creator';
            let settings_id = 0;

            let lifecycle = Lifecycle {
                mint: starknet::get_block_timestamp(), start: Option::None, end: Option::None,
            };

            let mut erc721 = get_dep_component_mut!(ref self, ERC721);
            erc721.mint(to, token_id.into());

            store
                .set_token_metadata(
                    @TokenMetadata { token_id, minted_by, player_name, settings_id, lifecycle },
                );
        }

        fn get_game_count(self: @ComponentState<TContractState>) -> u64 {
            let world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), self.get_namespace(),
            );
            let store: Store = StoreTrait::new(world);
            store.get_game_count()
        }

        fn set_settings(
            ref self: ComponentState<TContractState>,
            settings_id: u32,
            name: felt252,
            description: ByteArray,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), self.get_namespace(),
            );
            let mut store: Store = StoreTrait::new(world);
            store
                .set_settings_details(
                    @SettingsDetails { id: settings_id, name, description, exists: true },
                );
        }

        fn mint_game(
            ref self: ComponentState<TContractState>, ref store: Store, to: ContractAddress,
        ) -> u64 {
            // get erc721 component
            let mut erc721 = get_dep_component_mut!(ref self, ERC721);

            // increment and get next token id
            let token_id = store.increment_and_get_game_count();

            // mint new game token
            erc721.mint(to, token_id.into());

            // return new game token id
            token_id
        }

        fn assert_setting_exists(self: @ComponentState<TContractState>, settings_id: u32) {
            let setting_exists = self.get_contract().setting_exists(settings_id);
            if !setting_exists {
                let world = WorldTrait::storage(
                    self.get_contract().world_dispatcher(), self.get_namespace(),
                );
                let store: Store = StoreTrait::new(world);
                let game_metadata = store.get_game_metadata(get_contract_address());
                panic!("{}: Setting ID {} does not exist", game_metadata.name, settings_id);
            }
        }

        fn get_namespace(self: @ComponentState<TContractState>) -> @ByteArray {
            let namespace = self._namespace.read();
            @namespace
        }
    }
}
