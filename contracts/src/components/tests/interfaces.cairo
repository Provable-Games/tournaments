use tournaments::components::models::tournament::{
    Tournament as TournamentModel, TokenType, Registration, Prize, PrizeType, Metadata, GameConfig,
    EntryFee, EntryRequirement, QualificationProof,
};
use tournaments::components::models::schedule::{Schedule, Phase};   

use starknet::ContractAddress;
use dojo::world::{WorldStorage, WorldStorageTrait, IWorldDispatcher};

use tournaments::components::libs::utils::ZERO;

use game_components_minigame::tests::mocks::minigame_mock::{
    IMinigameMockDispatcher
};
use game_components_denshokan::interface::{IDenshokanDispatcher};

#[derive(Drop, Copy, Serde, Introspect)]
pub struct Token {
    pub token: ContractAddress,
    pub token_type: TokenType,
}

#[starknet::interface]
pub trait IERC20Mock<TState> {
    // IWorldProvider
    fn world_dispatcher(self: @TState) -> IWorldDispatcher;

    // IERC20
    fn total_supply(self: @TState) -> u256;
    fn balance_of(self: @TState, account: ContractAddress) -> u256;
    fn allowance(self: @TState, owner: ContractAddress, spender: ContractAddress) -> u256;
    fn transfer(ref self: TState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(
        ref self: TState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool;
    fn approve(ref self: TState, spender: ContractAddress, amount: u256) -> bool;
    // IERC20Metadata
    fn name(self: @TState) -> ByteArray;
    fn symbol(self: @TState) -> ByteArray;
    fn decimals(self: @TState) -> u8;
    // IERC20CamelOnly
    fn totalSupply(self: @TState) -> u256;
    fn balanceOf(self: @TState, account: ContractAddress) -> u256;
    fn transferFrom(
        ref self: TState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool;

    // IERCPublic
    fn mint(ref self: TState, recipient: ContractAddress, amount: u256);
}

#[starknet::interface]
pub trait IERC721Mock<TState> {
    // IWorldProvider
    fn world_dispatcher(self: @TState) -> IWorldDispatcher;

    // ISRC5
    fn supports_interface(self: @TState, interface_id: felt252) -> bool;
    // IERC721
    fn balance_of(self: @TState, account: ContractAddress) -> u256;
    fn owner_of(self: @TState, token_id: u256) -> ContractAddress;
    fn safe_transfer_from(
        ref self: TState,
        from: ContractAddress,
        to: ContractAddress,
        token_id: u256,
        data: Span<felt252>,
    );
    fn transfer_from(ref self: TState, from: ContractAddress, to: ContractAddress, token_id: u256);
    fn approve(ref self: TState, to: ContractAddress, token_id: u256);
    fn set_approval_for_all(ref self: TState, operator: ContractAddress, approved: bool);
    fn get_approved(self: @TState, token_id: u256) -> ContractAddress;
    fn is_approved_for_all(
        self: @TState, owner: ContractAddress, operator: ContractAddress,
    ) -> bool;
    // IERC721CamelOnly
    fn balanceOf(self: @TState, account: ContractAddress) -> u256;
    fn ownerOf(self: @TState, tokenId: u256) -> ContractAddress;
    fn safeTransferFrom(
        ref self: TState,
        from: ContractAddress,
        to: ContractAddress,
        tokenId: u256,
        data: Span<felt252>,
    );
    fn transferFrom(ref self: TState, from: ContractAddress, to: ContractAddress, tokenId: u256);
    fn setApprovalForAll(ref self: TState, operator: ContractAddress, approved: bool);
    fn getApproved(self: @TState, tokenId: u256) -> ContractAddress;
    fn isApprovedForAll(self: @TState, owner: ContractAddress, operator: ContractAddress) -> bool;
    // IERC721Metadata
    fn name(self: @TState) -> ByteArray;
    fn symbol(self: @TState) -> ByteArray;
    fn token_uri(self: @TState, token_id: u256) -> ByteArray;
    // IERC721MetadataCamelOnly
    fn tokenURI(self: @TState, tokenId: u256) -> ByteArray;

    // IERC721Public
    fn mint(ref self: TState, recipient: ContractAddress, token_id: u256);
}

// #[generate_trait]
// pub impl WorldImpl of WorldTrait {
//     fn contract_address(self: @WorldStorage, contract_name: @ByteArray) -> ContractAddress {
//         match self.dns(contract_name) {
//             Option::Some((contract_address, _)) => { (contract_address) },
//             Option::None => { (ZERO()) },
//         }
//     }

//     // Create a Store from a dispatcher
//     // https://github.com/dojoengine/dojo/blob/main/crates/dojo/core/src/contract/components/world_provider.cairo
//     // https://github.com/dojoengine/dojo/blob/main/crates/dojo/core/src/world/storage.cairo
//     #[inline(always)]
//     fn storage(dispatcher: IWorldDispatcher, namespace: @ByteArray) -> WorldStorage {
//         (WorldStorageTrait::new(dispatcher, namespace))
//     }

//     //
//     // addresses
//     //

//     #[inline(always)]
//     fn budokan_address(self: @WorldStorage) -> ContractAddress {
//         (self.contract_address(@"budokan"))
//     }

//     #[inline(always)]
//     fn minigame_mock_address(self: @WorldStorage) -> ContractAddress {
//         (self.contract_address(@"minigame_mock"))
//     }

//     #[inline(always)]
//     fn denshokan_address(self: @WorldStorage) -> ContractAddress {
//         (self.contract_address(@"denshokan"))
//     }

//     #[inline(always)]
//     fn erc20_mock_address(self: @WorldStorage) -> ContractAddress {
//         (self.contract_address(@"erc20_mock"))
//     }

//     #[inline(always)]
//     fn erc721_mock_address(self: @WorldStorage) -> ContractAddress {
//         (self.contract_address(@"erc721_mock"))
//     }

//     //
//     // dispatchers
//     //

//     #[inline(always)]
//     fn budokan_dispatcher(self: @WorldStorage) -> IBudokanDispatcher {
//         (IBudokanDispatcher { contract_address: self.budokan_address() })
//     }
//     #[inline(always)]
//     fn minigame_mock_dispatcher(self: @WorldStorage) -> IMinigameMockDispatcher {
//         (IMinigameMockDispatcher { contract_address: self.minigame_mock_address() })
//     }
//     #[inline(always)]
//     fn denshokan_dispatcher(self: @WorldStorage) -> IDenshokanDispatcher {
//         (IDenshokanDispatcher { contract_address: self.denshokan_address() })
//     }
//     #[inline(always)]
//     fn erc20_mock_dispatcher(self: @WorldStorage) -> IERC20MockDispatcher {
//         (IERC20MockDispatcher { contract_address: self.erc20_mock_address() })
//     }
//     #[inline(always)]
//     fn erc721_mock_dispatcher(self: @WorldStorage) -> IERC721MockDispatcher {
//         (IERC721MockDispatcher { contract_address: self.erc721_mock_address() })
//     }
// }
