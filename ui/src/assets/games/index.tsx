import { ChainId } from "@/dojo/setup/networks";
import { useDojo } from "@/context/dojo";

export interface Game {
  contract_address: string;
  name: string;
  image?: string;
  url?: string;
  controllerOnly?: boolean;
  playUrl?: string;
}

export const getGameUrl = (gameAddress: string): string => {
  const games = getGames();
  const game = games.find((game) => game.contract_address === gameAddress);
  return game?.url || "";
};

export const getPlayUrl = (gameAddress: string): string => {
  const games = getGames();
  const game = games.find((game) => game.contract_address === gameAddress);
  return game?.playUrl || "";
};

export const getGameName = (gameAddress: string): string => {
  const games = getGames();
  const game = games.find((game) => game.contract_address === gameAddress);
  return game?.name || "";
};

export const isControllerOnly = (gameAddress: string): boolean => {
  const games = getGames();
  const game = games.find((game) => game.contract_address === gameAddress);
  return game?.controllerOnly || false;
};

export const getGames = (): Game[] => {
  const { selectedChainConfig } = useDojo();
  const isSepolia = selectedChainConfig.chainId === ChainId.SN_SEPOLIA;
  const isLocalKatana = selectedChainConfig.chainId === ChainId.KATANA_LOCAL;
  const isMainnet = selectedChainConfig.chainId === ChainId.SN_MAIN;
  if (isLocalKatana) {
    return [
      {
        contract_address:
          "0x0165a0bd8cf98edcb6fd900cf10484cb73e7569676d3d13ddb28281709cfbb43",
        name: "0x4c6f6f74205375727669766f72",
        image: "https://lootsurvivor.io/favicon-32x32.png",
        url: "https://lootsurvivor.io",
        controllerOnly: true,
      },
    ];
  } else if (isSepolia) {
    return [
      {
        contract_address:
          "0x04359aee29873cd9603207d29b4140468bac3e042aa10daab2e1a8b2dd60ef7b",
        name: "Dark Shuffle",
        image: "https://darkshuffle.dev/favicon.svg",
        url: "https://darkshuffle.dev",
        controllerOnly: true,
      },
      {
        contract_address:
          "0x07ae26eecf0274aabb31677753ff3a4e15beec7268fa1b104f73ce3c89202831",
        name: "Death Mountain",
        image: "https://darkshuffle.dev/favicon.svg",
        url: "https://lootsurvivor.io/",
        playUrl: "https://lootsurvivor.io/survivor/play?id=",
        controllerOnly: true,
      },
    ];
  } else if (isMainnet) {
    return [
      {
        contract_address:
          "0x03451230bc1bbec7bb1f337f22c9f6699d238429638ac357dba53af193674c70",
        name: "Dark Shuffle",
        image: "https://darkshuffle.io/favicon.svg",
        url: "https://darkshuffle.io",
        controllerOnly: true,
      },
      {
        contract_address:
          "0x05e2dfbdc3c193de629e5beb116083b06bd944c1608c9c793351d5792ba29863",
        name: "Loot Survivor",
        image: "https://lootsurvivor.io/favicon-32x32.png",
        url: "https://tournaments.lootsurvivor.io/",
        playUrl: "https://tournaments.lootsurvivor.io/survivor/play?id=",
        controllerOnly: true,
      },
      {
        contract_address:
          "0x075bd3616302ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d",
        name: "Dope Wars",
        image: "https://dopewars.game/favicon.ico",
        url: "https://dopewars.game",
        controllerOnly: true,
      },
      {
        contract_address:
          "0x04fd5df500e6c6615e4423258639f189455672bc841ba58f1c781ac7c5ff4bd8",
        name: "zKube",
        image: "https://app.zkube.xyz/assets/pwa-512x512.png",
        url: "https://app.zkube.xyz/",
        controllerOnly: true,
      },
      {
        contract_address:
          "0x04d8ec93cc62296ecbd490406b034ada13bc4db5552f30d17f6e01270db7d62a",
        name: "Nums",
        controllerOnly: true,
      },
    ];
  } else {
    return [
      {
        contract_address:
          "0x0035389eec883a077ca4cc036cbe17fc802d297a08e8d7e930781de9ed492d05",
        name: "Loot Survivor",
        image: "https://lootsurvivor.io/favicon-32x32.png",
        url: "https://lootsurvivor.io",
      },
      {
        contract_address:
          "0x075bd3616602ebec162c920492e4d032155fd0d199f1ed44edcb2eec120feb3d",
        name: "Dark Shuffle",
        image: "https://darkshuffle.io/favicon.svg",
        url: "https://darkshuffle.io",
      },
      {
        contract_address:
          "0x075bd3616602ebec142c920492e4d042155fd0d199f1ed44edcb2eec120feb3d",
        name: "zKube",
        image: "https://zkube.io/favicon.svg",
        url: "https://zkube.io",
      },
      {
        contract_address:
          "0x075bd3616652ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d",
        name: "Dope Wars",
        image: "https://dopewars.gg/favicon.ico",
        url: "https://dopewars.gg",
      },
      {
        contract_address:
          "0x075bd3616302ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d",
        name: "Jokers of Neon",
        image: "https://jokersofneon.com/icon.png",
        url: "https://jokersofneon.com",
      },
    ];
  }
};
