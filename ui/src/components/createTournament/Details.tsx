import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StepProps } from "@/containers/CreateTournament";
import TokenGameIcon from "@/components/icons/TokenGameIcon";
import { Slider } from "@/components/ui/slider";
import { INFO } from "@/components/Icons";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import SettingsSection from "@/components/createTournament/settings/SettingsSection";
import useUIStore from "@/hooks/useUIStore";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const Details = ({ form }: StepProps) => {
  const { gameData } = useUIStore();
  const PREDEFINED_SIZES = [1, 3, 10, 20] as const;
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);

  useEffect(() => {
    const subscription = form.watch((_value, { name }) => {
      if (name === "game") {
        form.setValue("settings", "0");
      }
    });

    return () => subscription.unsubscribe();
  }, [form]);

  return (
    <>
      <div className="flex flex-col lg:p-2 2xl:p-4 gap-2 sm:gap-5">
        <div className="flex flex-col">
          <span className="font-brand text-lg sm:text-xl lg:text-2xl 2xl:text-3xl 3xl:text-4xl font-bold">
            Details
          </span>
          <div className="w-full h-0.5 bg-brand/25" />
        </div>
        <div className="flex flex-col sm:flex-row gap-5 sm:px-4">
          <div className="flex flex-col gap-2 sm:gap-5 w-full sm:w-3/5">
            <FormField
              control={form.control}
              name="game"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-row items-center gap-5">
                    <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                      Game
                    </FormLabel>
                    <FormDescription className="sm:text-xs xl:text-sm 3xl:text-base">
                      Choose the game to be played
                    </FormDescription>
                  </div>
                  <FormControl>
                    <div className="flex flex-row gap-5 overflow-x-auto pb-2">
                      {gameData.map((game) => (
                        <Card
                          key={game.contract_address}
                          variant={
                            field.value === game.contract_address
                              ? "default"
                              : "outline"
                          }
                          className={`flex flex-col justify-between sm:h-[100px] 3xl:h-[120px] w-[100px] 3xl:w-[120px] flex-shrink-0 p-2 hover:cursor-pointer ${
                            field.value === game.contract_address &&
                            "bg-brand-muted"
                          }`}
                          onClick={() => field.onChange(game.contract_address)}
                          disabled={!game.existsInMetadata}
                        >
                          <TokenGameIcon size="md" image={game.image} />
                          <Tooltip delayDuration={50}>
                            <TooltipTrigger asChild>
                              <p className="font-brand text-center truncate w-full 3xl:text-lg">
                                {game.name}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent className="border-brand bg-black text-neutral 3xl:text-lg">
                              {game.name}
                            </TooltipContent>
                          </Tooltip>
                        </Card>
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="w-full h-0.5 bg-brand/25" />
            <FormField
              control={form.control}
              name="settings"
              render={({ field }) => (
                <SettingsSection form={form} field={field} />
              )}
            />
          </div>
          <div className="w-full h-0.5 bg-brand/25 sm:hidden" />
          <div className="flex flex-col gap-5 w-full sm:w-2/5">
            <FormField
              control={form.control}
              name="name"
              render={({ field: { value, onChange, ...fieldProps } }) => (
                <FormItem>
                  <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                    Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="h-10 text-sm sm:text-base"
                      placeholder="Tournament name"
                      {...fieldProps}
                      value={typeof value === "string" ? value : ""}
                      onChange={(e) => onChange(e.target.value)}
                      maxLength={31}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                    Description
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[50px] text-sm sm:text-base"
                      placeholder="Tournament description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="w-full h-0.5 bg-brand/25" />
            <FormField
              control={form.control}
              name="leaderboardSize"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-row items-center gap-5 relative overflow-visible">
                    <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                      Leaderboard Size
                    </FormLabel>
                    <FormDescription className="hidden sm:block sm:text-xs xl:text-sm 3xl:text-base">
                      Size of the leaderboard
                    </FormDescription>
                    <div className="hidden sm:block">
                      <HoverCard openDelay={50} closeDelay={0}>
                        <HoverCardTrigger asChild>
                          <span className="absolute -top-4 right-0 w-6 h-6 cursor-pointer">
                            <INFO />
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80 p-4 text-sm z-50">
                          <div className="div flex flex-col gap-2">
                            <h4 className="text-lg">Leaderboard Size</h4>
                            <p className="text-muted-foreground">
                              Determines how many players are scored.
                            </p>
                            <p className="text-neutral text-wrap">
                              The size of the leaderboard governs how many
                              players can recieve entry fees and prizes as well
                              as who can qualify for further tournaments.
                            </p>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                    <div
                      className="sm:hidden absolute -top-4 right-0 w-6 h-6 cursor-pointer"
                      onClick={() => setIsMobileDialogOpen(true)}
                    >
                      <INFO />
                    </div>
                  </div>
                  <FormControl>
                    <div className="space-y-4">
                      <div className="flex flex-row items-center justify-between w-full">
                        <div className="flex flex-row items-center gap-2">
                          {PREDEFINED_SIZES.map((size) => (
                            <Button
                              key={size}
                              variant={
                                field.value === size ? "default" : "outline"
                              }
                              className={`sm:px-2 2xl:px-4`}
                              type="button"
                              onClick={() => field.onChange(size)}
                            >
                              Top {size}
                            </Button>
                          ))}
                        </div>
                        <span className="text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                          {field.value}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <Slider
                          min={1}
                          max={255}
                          step={1}
                          value={[field.value]}
                          onValueChange={(value) => field.onChange(value[0])}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>1</span>
                          <span>255</span>
                        </div>
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
      <Dialog open={isMobileDialogOpen} onOpenChange={setIsMobileDialogOpen}>
        <DialogContent className="sm:hidden bg-black border border-brand p-4 rounded-lg max-w-[90vw] mx-auto">
          <div className="flex flex-col gap-4 justify-between items-center mb-4">
            <h3 className="font-brand text-lg text-brand">Leaderboard Size</h3>
            <p className="text-muted-foreground">
              Determines how many players are scored.
            </p>
            <p className="text-neutral text-wrap text-sm text-center">
              The size of the leaderboard governs how many players can recieve
              entry fees and prizes as well as who can qualify for further
              tournaments.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Details;
