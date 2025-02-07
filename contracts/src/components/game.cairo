use starknet::ContractAddress;
use tournaments::components::models::game::{TokenMetadata};

// TODO: Move to interface file
#[starknet::interface]
pub trait ISettings<TState> {
    fn is_valid_setting(self: @TState, settings_id: u32) -> bool;
}

// TODO: Move to interface file
#[starknet::interface]
pub trait IGameDetails<TState> {
    fn score(self: @TState, game_id: u64) -> u32;
}

// TODO: Move to interface file
#[starknet::interface]
trait IGame<TState> {
    fn new_game(
        ref self: TState,
        player_name: felt252,
        settings_id: u32,
        available_at: u64,
        expires_at: u64,
        to: ContractAddress,
    ) -> u64;
    fn token_metadata(self: @TState, token_id: u64) -> TokenMetadata;
    fn game_count(self: @TState) -> u64;
}

///
/// Game Component
///
#[starknet::component]
pub mod game_component {
    use super::{IGame, ISettings, IGameDetails};
    use starknet::{ContractAddress, get_contract_address};
    use dojo::contract::components::world_provider::{IWorldProvider};

    use tournaments::components::models::game::{GameMetadata, TokenMetadata, SettingsDetails};
    use tournaments::components::interfaces::{WorldTrait, WorldImpl, IGAME_ID, IGAME_METADATA_ID};
    use tournaments::components::libs::game_store::{Store, StoreTrait};

    use openzeppelin_introspection::src5::SRC5Component;
    use openzeppelin_introspection::src5::SRC5Component::InternalTrait as SRC5InternalTrait;
    use openzeppelin_introspection::src5::SRC5Component::SRC5Impl;
    use openzeppelin_token::erc721::{
        ERC721Component, ERC721Component::{InternalImpl as ERC721InternalImpl},
    };

    use tournaments::components::constants::{DEFAULT_NS};


    #[storage]
    pub struct Storage {}

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
        fn new_game(
            ref self: ComponentState<TContractState>,
            player_name: felt252,
            settings_id: u32,
            available_at: u64,
            expires_at: u64,
            to: ContractAddress,
        ) -> u64 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);

            // verify settings exist
            self.assert_setting_exists(settings_id);

            // mint game token
            let token_id = self.mint_game(ref store, to);

            // get block timestamp and caller address
            let minted_at = starknet::get_block_timestamp();
            let minted_by = starknet::get_caller_address();

            // record token metadata
            store
                .set_token_metadata(
                    @TokenMetadata {
                        token_id,
                        minted_by,
                        player_name,
                        settings_id,
                        minted_at,
                        available_at,
                        expires_at,
                    },
                );

            // return the token id of the game
            token_id
        }

        fn token_metadata(self: @ComponentState<TContractState>, token_id: u64) -> TokenMetadata {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_token_metadata(token_id)
        }

        fn game_count(self: @ComponentState<TContractState>) -> u64 {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_game_count()
        }
    }
    #[generate_trait]
    pub impl InternalImpl<
        TContractState,
        +HasComponent<TContractState>,
        +IWorldProvider<TContractState>,
        +ERC721Component::ERC721HooksTrait<TContractState>,
        impl ERC721: ERC721Component::HasComponent<TContractState>,
        impl SRC5: SRC5Component::HasComponent<TContractState>,
        +Drop<TContractState>,
    > of InternalTrait<TContractState> {
        fn initializer(
            ref self: ComponentState<TContractState>,
            name: felt252,
            description: ByteArray,
            developer: felt252,
            publisher: felt252,
            genre: felt252,
            image: ByteArray,
        ) {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            store
                .set_game_metadata(
                    @GameMetadata {
                        address: get_contract_address(),
                        name,
                        description,
                        developer,
                        publisher,
                        genre,
                        image,
                    },
                );

            let mut src5_component = get_dep_component_mut!(ref self, SRC5);
            src5_component.register_interface(IGAME_ID);
            src5_component.register_interface(IGAME_METADATA_ID);
        }

        fn get_game_count(self: @ComponentState<TContractState>) -> u64 {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
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
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
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

        fn _setting_exists(self: @ComponentState<TContractState>, settings_id: u32) -> bool {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_settings_details(settings_id).exists
        }

        fn assert_setting_exists(self: @ComponentState<TContractState>, settings_id: u32) {
            assert!(self._setting_exists(settings_id), "Setting ID {} does not exist", settings_id);
        }
    }
}
