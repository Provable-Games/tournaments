import type { FunctionComponent, ImgHTMLAttributes } from "react";
import lootSurvivor from "./loot-survivor.png";
import darkShuffle from "./dark-shuffle.svg";
import zkube from "./zkube.png";
import dopeWars from "./dope-wars.png";
import jokersOfNeon from "./jokers-of-neon.png";
import { ChainId } from "@/dojo/config";
import { useDojo } from "@/context/dojo";
// import { useDojoSystem } from "@/dojo/hooks/useDojoSystem";
// import { addAddressPadding } from "starknet";

export interface Game {
  name: string;
  Icon: FunctionComponent<ImgHTMLAttributes<HTMLImageElement>>;
  url: string;
}

export const getGameUrl = (gameAddress: string): string => {
  const games = getGames();
  const game = games[gameAddress];
  return game?.url || "";
};

export const getGames = (): Record<string, Game> => {
  const { selectedChainConfig } = useDojo();
  const isSepolia = selectedChainConfig.chainId === ChainId.SN_SEPOLIA;
  const isLocalKatana = selectedChainConfig.chainId === ChainId.KATANA_LOCAL;
  const isMainnet = selectedChainConfig.chainId === ChainId.SN_MAIN;
  // const gameMockAddress = useDojoSystem("game_mock").contractAddress;
  if (isLocalKatana) {
    return {
      "0x06b9ae82d70df624b322f96a602cbf95301e0bf03b9381ce7bdbbf23916573b2": {
        name: "Loot Survivor",
        Icon: function LootSurvivorIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={lootSurvivor} {...props} />;
        },
        url: "https://lootsurvivor.io",
      },
    };
  } else if (isSepolia) {
    return {
      "0x0711a2ed50ba5442259950cf741b81f66f17b9b751e44d0368a87926a3233e3e": {
        name: "Dark Shuffle",
        Icon: function DarkShuffleIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={darkShuffle} {...props} />;
        },
        url: "https://darkshuffle.io",
      },
    };
  } else if (isMainnet) {
    return {
      "0x020fc3c9efd0dde5f53642dac7f53638aeaae98ff9af5f1642546f389ce9dec5": {
        name: "Dark Shuffle",
        Icon: function DarkShuffleIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={darkShuffle} {...props} />;
        },
        url: "https://darkshuffle.io",
      },
      "0x072e1affe9a2d0a1852238073bc2f81e059ad7ab500e788046ac2f0b89b0c94a": {
        name: "Loot Survivor",
        Icon: function LootSurvivorIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={lootSurvivor} {...props} />;
        },
        url: "https://lootsurvivor.io",
      },
      "0x075bd3616302ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d": {
        name: "Jokers of Neon",
        Icon: function JokersOfNeonIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={jokersOfNeon} {...props} />;
        },
        url: "https://jokersofneon.com",
      },
    };
  } else {
    return {
      "0x072e1affe9a2d0a1852238073bc2f81e059ad7ab500e788046ac2f0b89b0c94a": {
        name: "Loot Survivor",
        Icon: function LootSurvivorIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={lootSurvivor} {...props} />;
        },
        url: "https://lootsurvivor.io",
      },
      "0x075bd3616602ebec162c920492e4d032155fd0d199f1ed44edcb2eec120feb3d": {
        name: "Dark Shuffle",
        Icon: function DarkShuffleIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={darkShuffle} {...props} />;
        },
        url: "https://darkshuffle.io",
      },
      "0x075bd3616602ebec142c920492e4d042155fd0d199f1ed44edcb2eec120feb3d": {
        name: "zKube",
        Icon: function ZkubeIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
          return <img src={zkube} {...props} />;
        },
        url: "https://zkube.io",
      },
      "0x075bd3616652ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d": {
        name: "Dope Wars",
        Icon: function DopeWarsIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={dopeWars} {...props} />;
        },
        url: "https://dopewars.gg",
      },
      "0x075bd3616302ebec162c920492e4d042155fd0d199f1ed44edcb2eec120feb3d": {
        name: "Jokers of Neon",
        Icon: function JokersOfNeonIcon(
          props: ImgHTMLAttributes<HTMLImageElement>
        ) {
          return <img src={jokersOfNeon} {...props} />;
        },
        url: "https://jokersofneon.com",
      },
    };
  }
};
