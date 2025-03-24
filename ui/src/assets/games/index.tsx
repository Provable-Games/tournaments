import { ChainId } from "@/dojo/setup/networks";
import { useDojo } from "@/context/dojo";
// import { useDojoSystem } from "@/dojo/hooks/useDojoSystem";
// import { addAddressPadding } from "starknet";

export interface Game {
  contract_address: string;
  name: string;
  image: string;
  url: string;
}

export const getGameUrl = (gameAddress: string): string => {
  const games = getGames();
  const game = games.find((game) => game.contract_address === gameAddress);
  return game?.url || "";
};

export const getGameName = (gameAddress: string): string => {
  const games = getGames();
  const game = games.find((game) => game.contract_address === gameAddress);
  return game?.name || "";
};

export const getGames = (): Game[] => {
  const { selectedChainConfig } = useDojo();
  const isSepolia = selectedChainConfig.chainId === ChainId.SN_SEPOLIA;
  const isLocalKatana = selectedChainConfig.chainId === ChainId.KATANA_LOCAL;
  const isMainnet = selectedChainConfig.chainId === ChainId.SN_MAIN;
  // const gameMockAddress = useDojoSystem("game_mock").contractAddress;
  if (isLocalKatana) {
    return [
      {
        contract_address:
          "0x0035389eec883a077ca4cc036cbe17fc802d297a08e8d7e930781de9ed492d05",
        name: "0x4c6f6f74205375727669766f72",
        image: "https://lootsurvivor.io/favicon-32x32.png",
        url: "https://lootsurvivor.io",
      },
    ];
  } else if (isSepolia) {
    return [
      {
        contract_address:
          "0x0711a2ed50ba5442259950cf741b81f66f17b9b751e44d0368a87926a3233e3e",
        name: "0x4461726b2053687566666c65",
        image: "https://darkshuffle.io/favicon.svg",
        url: "https://darkshuffle.io",
      },
    ];
  } else if (isMainnet) {
    return [
      {
        contract_address:
          "0x0320f977f47f0885e376b781d9e244d9f59f10154ce844ae1815c919f0374726",
        name: "0x4461726b2053687566666c65",
        image: "https://darkshuffle.io/favicon.svg",
        url: "https://darkshuffle.io",
      },
      {
        contract_address:
          "0x072e1affe9a2d0a1852238073bc2f81e059ad7ab500e788046ac2f0b89b0c94a",
        name: "0x4c6f6f74205375727669766f72",
        image: "https://lootsurvivor.io/favicon-32x32.png",
        url: "https://lootsurvivor.io",
      },
      {
        contract_address:
          "0x075bd3616302ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d",
        name: "0x4a6f6b657273204f66204e656f6e",
        image: "https://jokersofneon.com/icon.png",
        url: "https://jokersofneon.com",
      },
    ];
  } else {
    return [
      {
        contract_address:
          "0x0035389eec883a077ca4cc036cbe17fc802d297a08e8d7e930781de9ed492d05",
        name: "0x4c6f6f74205375727669766f72",
        image: "https://lootsurvivor.io/favicon-32x32.png",
        url: "https://lootsurvivor.io",
      },
      {
        contract_address:
          "0x075bd3616602ebec162c920492e4d032155fd0d199f1ed44edcb2eec120feb3d",
        name: "0x4461726b2053687566666c65",
        image: "https://darkshuffle.io/favicon.svg",
        url: "https://darkshuffle.io",
      },
      {
        contract_address:
          "0x075bd3616602ebec142c920492e4d042155fd0d199f1ed44edcb2eec120feb3d",
        name: "0x7a4b756265",
        image: "https://zkube.io/favicon.svg",
        url: "https://zkube.io",
      },
      {
        contract_address:
          "0x075bd3616652ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d",
        name: "0x446f70652057617273",
        image: "https://dopewars.gg/favicon.ico",
        url: "https://dopewars.gg",
      },
      {
        contract_address:
          "0x075bd3616302ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d",
        name: "0x4a6f6b657273204f66204e656f6e",
        image: "https://jokersofneon.com/icon.png",
        url: "https://jokersofneon.com",
      },
    ];
  }
};
