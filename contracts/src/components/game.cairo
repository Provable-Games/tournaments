use starknet::ContractAddress;
use tournaments::components::models::game::SettingsDetails;

#[starknet::interface]
trait IGame<TState> {
    fn new_game(ref self: TState, settings_id: u32, to: ContractAddress) -> u64;
    fn get_settings_id(self: @TState, token_id: u64) -> u32;
    fn get_settings_details(self: @TState, settings_id: u32) -> SettingsDetails;
    fn settings_exists(self: @TState, settings_id: u32) -> bool;
}

///
/// Game Component
///
#[starknet::component]
pub mod game_component {
    use super::IGame;

    use starknet::{ContractAddress, get_contract_address};
    use dojo::contract::components::world_provider::{IWorldProvider};

    use tournaments::components::models::game::{GameMetadata, SettingsDetails, GameSettings};
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
        impl SRC5: SRC5Component::HasComponent<TContractState>,
        impl ERC721: ERC721Component::HasComponent<TContractState>,
        +Drop<TContractState>,
    > of IGame<ComponentState<TContractState>> {
        fn new_game(
            ref self: ComponentState<TContractState>, settings_id: u32, to: ContractAddress,
        ) -> u64 {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);

            // verify settings exist
            self.assert_setting_exists(settings_id);

            // mint game token
            let game_token_id = self.mint_game(ref store, to);

            // set game settings
            store.set_game_settings(@GameSettings { game_token_id, settings_id });

            // return the game token id
            game_token_id
        }

        fn get_settings_id(self: @ComponentState<TContractState>, token_id: u64) -> u32 {
            let world = WorldTrait::storage(self.get_contract().world_dispatcher(), DEFAULT_NS());
            let store: Store = StoreTrait::new(world);
            store.get_game_settings(token_id).settings_id
        }

        fn get_settings_details(
            self: @ComponentState<TContractState>, settings_id: u32,
        ) -> SettingsDetails {
            let mut world = WorldTrait::storage(
                self.get_contract().world_dispatcher(), DEFAULT_NS(),
            );
            let mut store: Store = StoreTrait::new(world);
            store.get_settings_details(settings_id)
        }

        fn settings_exists(self: @ComponentState<TContractState>, settings_id: u32) -> bool {
            self._setting_exists(settings_id)
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
                        game_address: get_contract_address(),
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
            store.get_game_count().count.into()
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
