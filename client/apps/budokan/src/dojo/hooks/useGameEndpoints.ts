import { useState, useEffect } from "react";
import { useProvider } from "@starknet-react/core";
import { ByteArray, byteArray } from "starknet";

export const useGameEndpoints = (gameAddress: string) => {
  const { provider } = useProvider();
  const [gameNamespace, setgameNamespace] = useState<string | null>(null);
  const [gameScoreModel, setGameScoreModel] = useState<string | null>(null);
  const [gameScoreAttribute, setGameScoreAttribute] = useState<string | null>(
    null
  );
  const [gameSettingsModel, setGameSettingsModel] = useState<string | null>(
    null
  );

  const getgameNamespace = async () => {
    const gameNamespace = await provider.callContract({
      contractAddress: gameAddress,
      entrypoint: "namespace",
      calldata: [],
    });
    const gameNamespaceByteArray: ByteArray = {
      data: gameNamespace.slice(0, -2),
      pending_word: gameNamespace[gameNamespace.length - 2],
      pending_word_len: gameNamespace[gameNamespace.length - 1],
    };
    setgameNamespace(byteArray.stringFromByteArray(gameNamespaceByteArray));
  };

  const getGameScoreData = async () => {
    const gameScoreModelData = await provider.callContract({
      contractAddress: gameAddress,
      entrypoint: "score_model",
      calldata: [],
    });
    const gameScoreModelByteArray: ByteArray = {
      data: gameScoreModelData.slice(0, -2),
      pending_word: gameScoreModelData[gameScoreModelData.length - 2],
      pending_word_len: gameScoreModelData[gameScoreModelData.length - 1],
    };
    const gameScoreAttributeData = await provider.callContract({
      contractAddress: gameAddress,
      entrypoint: "score_attribute",
      calldata: [],
    });
    const gameScoreAttributeByteArray: ByteArray = {
      data: gameScoreAttributeData.slice(0, -2),
      pending_word: gameScoreAttributeData[gameScoreAttributeData.length - 2],
      pending_word_len:
        gameScoreAttributeData[gameScoreAttributeData.length - 1],
    };
    const gameScoreModel = byteArray.stringFromByteArray(
      gameScoreModelByteArray
    );
    const gameScoreAttribute = byteArray.stringFromByteArray(
      gameScoreAttributeByteArray
    );
    setGameScoreModel(gameScoreModel);
    setGameScoreAttribute(gameScoreAttribute);
  };

  const getGameSettings = async () => {
    const gameSettingsData = await provider.callContract({
      contractAddress: gameAddress,
      entrypoint: "settings_model",
      calldata: [],
    });
    const gameSettingsByteArray: ByteArray = {
      data: gameSettingsData.slice(0, -2),
      pending_word: gameSettingsData[gameSettingsData.length - 2],
      pending_word_len: gameSettingsData[gameSettingsData.length - 1],
    };
    const gameSettings = byteArray.stringFromByteArray(gameSettingsByteArray);
    setGameSettingsModel(gameSettings);
  };

  useEffect(() => {
    if (gameAddress) {
      getgameNamespace();
      getGameScoreData();
      getGameSettings();
    }
  }, [provider, gameAddress]);

  return {
    gameNamespace,
    gameScoreModel,
    gameScoreAttribute,
    gameSettingsModel,
  };
};
