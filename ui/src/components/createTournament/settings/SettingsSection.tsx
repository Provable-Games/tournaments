import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import SettingsCarousel from "./SettingsCarousel";
import SmallSettingsTable from "./SmallSettingsTable";
import { UseFormReturn, ControllerRenderProps } from "react-hook-form";
import { useGameEndpoints } from "@/dojo/hooks/useGameEndpoints";
import { useGetGameSettingsQuery } from "@/dojo/hooks/useSdkQueries";
import { feltToString } from "@/lib/utils";
import { Settings, SettingsDetails } from "@/generated/models.gen";
import { useMemo } from "react";
import { useDojoStore } from "@/dojo/hooks/useDojoStore";

interface GameSettingsFieldProps {
  form: UseFormReturn<any>;
  field: ControllerRenderProps<any, any>;
}

const GameSettingsField = ({ form, field }: GameSettingsFieldProps) => {
  const { gameNamespace, gameSettingsModel } = useGameEndpoints(
    form.watch("game")
  );
  useGetGameSettingsQuery(gameNamespace ?? "", gameSettingsModel ?? "");
  const settingsDetails = useDojoStore((state) =>
    state.getEntitiesByModel(gameNamespace ?? "", "SettingsDetails")
  );
  const settings = useDojoStore((state) =>
    state.getEntitiesByModel(gameNamespace ?? "", "Settings")
  );

  const settingsEntities = [...settingsDetails, ...settings];

  const mergedGameSettings = useMemo(() => {
    if (!settingsEntities) return {};

    return settingsEntities.reduce(
      (acc, entity) => {
        const details = entity.models[gameNamespace ?? ""]
          .SettingsDetails as SettingsDetails;
        const settings = entity.models[gameNamespace ?? ""]
          .Settings as Settings;
        const detailsId = details.id.toString();

        // If this details ID doesn't exist yet, create it
        if (!acc[detailsId]) {
          acc[detailsId] = {
            ...details,
            hasSettings: false,
            settings: [],
          };
        }

        // If we have settings, add them to the array and set hasSettings to true
        if (settings) {
          acc[detailsId].settings.push(settings);
          acc[detailsId].hasSettings = true;
        }

        return acc;
      },
      {} as Record<
        string,
        SettingsDetails & {
          hasSettings: boolean;
          settings: Settings[];
        }
      >
    );
  }, [settingsEntities, form.watch("game")]);

  const hasSettings = mergedGameSettings[field.value]?.hasSettings ?? false;
  return (
    <FormItem>
      <div className="flex flex-row items-center gap-5">
        <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
          Settings
        </FormLabel>
        <FormDescription className="sm:text-xs xl:text-sm 3xl:text-base">
          Select the game settings
        </FormDescription>
      </div>
      <FormControl>
        <div className="flex flex-col gap-4">
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <h3 className="font-brand text-lg">
                  {hasSettings
                    ? feltToString(mergedGameSettings[field.value]?.name ?? "")
                    : "Default"}
                </h3>
                <p className="text-sm text-brand-muted">
                  {hasSettings
                    ? mergedGameSettings[field.value]?.description
                    : "No settings available"}
                </p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!form.watch("game") || !hasSettings}
                  >
                    Select Settings
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Game Settings</DialogTitle>
                  </DialogHeader>
                  {form.watch("game") && (
                    <SettingsCarousel
                      game={form.watch("game")}
                      settings={mergedGameSettings}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                </DialogContent>
              </Dialog>
            </div>

            <SmallSettingsTable
              hasSettings={
                mergedGameSettings[field.value]?.hasSettings ?? false
              }
              settings={mergedGameSettings[field.value]?.settings ?? []}
            />
          </div>
        </div>
      </FormControl>
      <FormMessage />
    </FormItem>
  );
};

export default GameSettingsField;
