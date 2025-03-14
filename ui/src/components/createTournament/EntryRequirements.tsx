import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StepProps } from "@/containers/CreateTournament";
import { TROPHY, USER, X } from "@/components/Icons";
import { displayAddress, feltToString } from "@/lib/utils";
import TokenGameIcon from "@/components/icons/TokenGameIcon";
import { Search } from "lucide-react";
import TokenDialog from "@/components/dialogs/Token";
import { Token } from "@/generated/models.gen";
import { useDojo } from "@/context/dojo";
import {
  useGetTournaments,
  useGetTournamentsCount,
} from "@/dojo/hooks/useSqlQueries";
import {
  // calculateTotalValue,
  // extractEntryFeePrizes,
  // getErc20TokenSymbols,
  // groupPrizesByTokens,
  processTournamentFromSql,
} from "@/lib/utils/formatting";
import { processPrizesFromSql } from "@/lib/utils/formatting";
// import { getGames } from "@/assets/games";
import Pagination from "@/components/table/Pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import useUIStore from "@/hooks/useUIStore";
// import { useEkuboPrices } from "@/hooks/useEkuboPrices";
// import { tokens } from "@/lib/tokensMeta";
import { OptionalSection } from "@/components/createTournament/containers/OptionalSection";
import { getChecksumAddress, validateChecksumAddress } from "starknet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const EntryRequirements = ({ form }: StepProps) => {
  const { nameSpace } = useDojo();
  const [newAddress, setNewAddress] = React.useState("");
  const [tournamentSearchQuery, setTournamentSearchQuery] = useState("");
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [gameFilters, setGameFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { gameData } = useUIStore();
  const [addressError, setAddressError] = useState("");

  const ENTRY_LIMIT_OPTIONS = [
    { value: 1, label: "1" },
    { value: 2, label: "2" },
    { value: 3, label: "3" },
    { value: 5, label: "5" },
    { value: 10, label: "10" },
  ];

  const { data: tournaments } = useGetTournaments({
    namespace: nameSpace,
    gameFilters: gameFilters,
    limit: 10,
    offset: (currentPage - 1) * 10,
    status: "all",
    active: true,
  });

  const { data: tournamentsCount } = useGetTournamentsCount({
    namespace: nameSpace,
  });

  const tournamentsData = tournaments.map((tournament) => {
    const processedTournament = processTournamentFromSql(tournament);
    const processedPrizes = processPrizesFromSql(
      tournament.prizes,
      tournament.id
    );
    return {
      tournament: processedTournament,
      prizes: processedPrizes,
      entryCount: Number(tournament.entry_count),
    };
  });

  const handleGatingTypeChange = (
    type: "token" | "tournament" | "addresses"
  ) => {
    form.setValue("gatingOptions.type", type);

    form.setValue("gatingOptions.token", undefined);
    form.setValue("gatingOptions.tournament.requirement", "participated");
    form.setValue("gatingOptions.tournament.tournaments", []);
    form.setValue("gatingOptions.addresses", []);
  };

  const getTournamentStatus = (isStarted: boolean, isEnded: boolean) => {
    if (isEnded) return "Ended";
    if (isStarted) return "Live";
    return "Upcoming";
  };

  // const erc20TokenSymbols = getErc20TokenSymbols(groupedPrizes);
  // const { prices, isLoading: pricesLoading } = useEkuboPrices({
  //   tokens: [...erc20TokenSymbols, entryFeeTokenSymbol ?? ""],
  // });

  return (
    <FormField
      control={form.control}
      name="enableGating"
      render={({ field }) => (
        <FormItem className="flex flex-col sm:p-4">
          <OptionalSection
            label="Entry Requirements"
            description="Enable participation restrictions"
            checked={field.value}
            onCheckedChange={field.onChange}
          />

          {field.value && (
            <>
              <div className="w-full h-0.5 bg-brand/25" />
              <div className="space-y-4 p-4">
                <div className="flex flex-row gap-4">
                  <div className="space-y-4 w-1/2">
                    <div className="flex flex-row items-center gap-5">
                      <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                        Requirement Type
                      </FormLabel>
                      <FormDescription className="hidden sm:block">
                        Choose the requirement type for the tournament
                      </FormDescription>
                    </div>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={
                          form.watch("gatingOptions.type") === "token"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => handleGatingTypeChange("token")}
                      >
                        Token
                      </Button>
                      <Button
                        type="button"
                        variant={
                          form.watch("gatingOptions.type") === "tournament"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => handleGatingTypeChange("tournament")}
                      >
                        Tournaments
                      </Button>
                      <Button
                        type="button"
                        variant={
                          form.watch("gatingOptions.type") === "addresses"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => handleGatingTypeChange("addresses")}
                      >
                        Whitelist{" "}
                        <span className="hidden sm:inline">Addresses</span>
                      </Button>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="enableEntryLimit"
                    render={({ field }) => (
                      <FormItem className="w-1/2">
                        <div className="flex flex-col">
                          <div className="flex flex-row items-center gap-5">
                            <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                              Entry Limit
                            </FormLabel>
                            <FormDescription className="hidden sm:block">
                              Set an entry limit for the tournament
                            </FormDescription>
                            <FormControl className="hidden sm:flex">
                              <div className="flex flex-row items-center gap-2">
                                <span className="uppercase text-neutral font-bold">
                                  Optional
                                </span>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </div>
                            </FormControl>
                          </div>
                        </div>
                        {field.value && (
                          <FormField
                            control={form.control}
                            name="gatingOptions.entry_limit"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <div className="flex flex-row items-center gap-5">
                                    <div
                                      className={`flex flex-row items-center justify-center sm:justify-start gap-2 w-1/2`}
                                    >
                                      {ENTRY_LIMIT_OPTIONS.map(
                                        ({ value, label }) => (
                                          <Button
                                            key={value}
                                            type="button"
                                            variant={
                                              field.value === value
                                                ? "default"
                                                : "outline"
                                            }
                                            className="px-2"
                                            onClick={() => {
                                              field.onChange(value);
                                            }}
                                          >
                                            {label}
                                          </Button>
                                        )
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-2 w-1/2">
                                      <div className="flex justify-between items-center">
                                        <Label className="xl:text-xs 2xl:text-sm font-medium">
                                          Entries
                                        </Label>
                                        <span className="text-sm text-muted-foreground xl:text-xs 2xl:text-sm">
                                          {field.value ?? 0}
                                        </span>
                                      </div>
                                      <Slider
                                        value={[field.value ?? 0]}
                                        onValueChange={([entries]) => {
                                          field.onChange(entries);
                                        }}
                                        max={100}
                                        min={1}
                                        step={1}
                                      />
                                    </div>
                                  </div>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                {form.watch("gatingOptions.type") === "token" && (
                  <>
                    <div className="w-full h-0.5 bg-brand/25" />
                    <div className="flex flex-row items-center gap-5">
                      <FormField
                        control={form.control}
                        name="gatingOptions.token"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <div className="flex flex-row items-center gap-5">
                                <TokenDialog
                                  selectedToken={selectedToken}
                                  onSelect={(token) => {
                                    setSelectedToken(token);
                                    field.onChange(token.address);
                                  }}
                                  type="erc721"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {form.watch("gatingOptions.type") === "tournament" && (
                  <>
                    <div className="w-full h-0.5 bg-brand/25" />
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="gatingOptions.tournament.requirement"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-row items-center gap-5">
                              <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                                Requirement
                              </FormLabel>
                              <FormDescription className="hidden sm:block">
                                Choose whether previous tournaments must have
                                been won or only participated in
                              </FormDescription>
                            </div>
                            <FormControl>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant={
                                    field.value === "participated"
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() => field.onChange("participated")}
                                >
                                  Participated
                                </Button>
                                <Button
                                  type="button"
                                  variant={
                                    field.value === "won"
                                      ? "default"
                                      : "outline"
                                  }
                                  onClick={() => field.onChange("won")}
                                >
                                  Won
                                </Button>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="w-full h-0.5 bg-brand/25" />
                      <FormField
                        control={form.control}
                        name="gatingOptions.tournament.tournaments"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-row items-center gap-5">
                              <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                                Tournaments
                              </FormLabel>
                              <FormDescription>Add tournaments</FormDescription>
                            </div>
                            <FormControl>
                              <div className="flex gap-2">
                                <div className="flex flex-wrap gap-2">
                                  {(field.value || []).map(
                                    (selectedTournament) => {
                                      return (
                                        <div
                                          key={selectedTournament.id}
                                          className="inline-flex items-center gap-2 p-2 border border-brand-muted rounded w-fit"
                                        >
                                          <span>
                                            {feltToString(
                                              selectedTournament.metadata.name
                                            )}{" "}
                                            -{" "}
                                            {Number(
                                              selectedTournament.id
                                            ).toString()}
                                          </span>
                                          <span
                                            className="h-4 w-4 hover:cursor-pointer"
                                            onClick={() => {
                                              field.onChange(
                                                field.value.filter(
                                                  (v) =>
                                                    v !== selectedTournament
                                                )
                                              );
                                            }}
                                          >
                                            <X />
                                          </span>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>

                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="outline"
                                      type="button"
                                      disabled={
                                        !form.watch(
                                          "gatingOptions.tournament.requirement"
                                        )
                                      }
                                    >
                                      {!form.watch(
                                        "gatingOptions.tournament.requirement"
                                      )
                                        ? "Select requirement first"
                                        : "Select"}
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="h-[600px] flex flex-col gap-0 p-0">
                                    <DialogHeader className="flex-shrink-0">
                                      <DialogTitle className="p-4">
                                        Select Tournament
                                      </DialogTitle>
                                      {/* Search input */}
                                      <div className="px-4 pb-2 flex flex-col gap-2">
                                        <div className="flex items-center border rounded border-brand-muted bg-background">
                                          <Search className="w-4 h-4 ml-3 text-muted-foreground" />
                                          <Input
                                            placeholder="Search tournaments..."
                                            value={tournamentSearchQuery}
                                            onChange={(e) =>
                                              setTournamentSearchQuery(
                                                e.target.value
                                              )
                                            }
                                            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                                          />
                                        </div>
                                        <div className="flex flex-row gap-2">
                                          {gameData.map((game) => (
                                            <div
                                              key={game.contract_address}
                                              className={`h-8 ${
                                                gameFilters.includes(
                                                  game.contract_address
                                                )
                                                  ? "bg-brand-muted text-black"
                                                  : "bg-black"
                                              } border border-brand-muted px-2 flex items-center gap-2 cursor-pointer`}
                                              onClick={() => {
                                                if (
                                                  gameFilters.includes(
                                                    game.contract_address
                                                  )
                                                ) {
                                                  setGameFilters(
                                                    gameFilters.filter(
                                                      (g) =>
                                                        g !==
                                                        game.contract_address
                                                    )
                                                  );
                                                } else {
                                                  setGameFilters([
                                                    ...gameFilters,
                                                    game.contract_address,
                                                  ]);
                                                }
                                              }}
                                            >
                                              {feltToString(game.name)}
                                              <span className="flex items-center justify-center">
                                                <TokenGameIcon
                                                  size="xs"
                                                  game={game.contract_address}
                                                />
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </DialogHeader>

                                    {/* Tournament list */}
                                    <div className="flex-1 overflow-y-auto border-t border-brand-muted">
                                      {tournamentsData?.length > 0 ? (
                                        tournamentsData.map(
                                          (tournament, index) => {
                                            const isStarted =
                                              Number(
                                                tournament?.tournament.schedule
                                                  .game.start
                                              ) <
                                              Number(
                                                BigInt(Date.now()) / 1000n
                                              );

                                            const isEnded =
                                              Number(
                                                tournament.tournament.schedule
                                                  .game.end
                                              ) <
                                              Number(
                                                BigInt(Date.now()) / 1000n
                                              );
                                            const status = getTournamentStatus(
                                              isStarted,
                                              isEnded
                                            );
                                            const name = gameData.find(
                                              (game) =>
                                                game.contract_address ===
                                                tournament.tournament
                                                  .game_config.address
                                            )?.name;
                                            // const processedPrizes =
                                            //   processPrizesFromSql(
                                            //     tournament.prizes,
                                            //     tournament.tournament.id
                                            //   );
                                            // const entryFeePrizes =
                                            //   extractEntryFeePrizes(
                                            //     tournament?.tournament.id,
                                            //     tournament?.tournament
                                            //       .entry_fee,
                                            //     tournament?.entryCount
                                            //   );

                                            // const allPrizes = [
                                            //   ...entryFeePrizes,
                                            //   ...(processedPrizes ?? []),
                                            // ];

                                            // const groupedPrizes = groupPrizesByTokens(allPrizes, tokens);

                                            // const totalPrizesValueUSD = calculateTotalValue(groupedPrizes, prices);
                                            const beenSelected = (
                                              field.value || []
                                            ).some(
                                              (element) =>
                                                element.id ===
                                                tournament.tournament.id
                                            );
                                            const content = (
                                              <div
                                                key={index}
                                                className={`flex flex-row items-center justify-between border-b border-brand-muted ${
                                                  beenSelected
                                                    ? "bg-brand/70 text-black"
                                                    : "bg-background hover:bg-brand/20"
                                                } px-4 py-2 hover:cursor-pointer`}
                                                onClick={() => {
                                                  if (!beenSelected) {
                                                    field.onChange([
                                                      ...(field.value || []),
                                                      tournament.tournament,
                                                    ]);
                                                  }
                                                }}
                                              >
                                                <div className="flex flex-row items-center gap-2">
                                                  <span className="font-brand">
                                                    {feltToString(
                                                      tournament.tournament
                                                        .metadata.name
                                                    )}
                                                  </span>
                                                  -
                                                  <span className="font-brand">
                                                    #
                                                    {Number(
                                                      tournament.tournament.id
                                                    ).toString()}
                                                  </span>
                                                </div>
                                                <span className="font-brand">
                                                  {status}
                                                </span>
                                                <div className="flex flex-row">
                                                  <span className="w-6 h-6">
                                                    <USER />
                                                  </span>
                                                  {tournament.entryCount}
                                                </div>
                                                <div className="relative group flex items-center justify-center">
                                                  <Tooltip delayDuration={50}>
                                                    <TooltipTrigger asChild>
                                                      <div className="flex items-center justify-center">
                                                        <TokenGameIcon
                                                          size="sm"
                                                          game={
                                                            tournament
                                                              .tournament
                                                              .game_config
                                                              .address
                                                          }
                                                        />
                                                      </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent
                                                      side="top"
                                                      className="bg-black text-neutral border border-brand-muted px-2 py-1 rounded text-sm"
                                                    >
                                                      {name
                                                        ? feltToString(name)
                                                        : "Unknown"}
                                                    </TooltipContent>
                                                  </Tooltip>
                                                </div>
                                                {/* <div>${tournament.pot}</div> */}
                                                <div className="flex flex-row items-center">
                                                  <span className="w-5 h-5">
                                                    <TROPHY />
                                                  </span>
                                                  {Number(
                                                    tournament.tournament
                                                      .game_config.prize_spots
                                                  ).toString()}
                                                </div>
                                              </div>
                                            );

                                            return beenSelected ? (
                                              content
                                            ) : (
                                              <DialogClose asChild key={index}>
                                                {content}
                                              </DialogClose>
                                            );
                                          }
                                        )
                                      ) : (
                                        <div className="flex items-center justify-center h-32 text-muted-foreground">
                                          No tournaments found
                                        </div>
                                      )}
                                    </div>
                                    <div className="px-4 pb-2 flex justify-center">
                                      <Pagination
                                        totalPages={Math.ceil(
                                          tournamentsCount / 10
                                        )}
                                        currentPage={currentPage}
                                        setCurrentPage={setCurrentPage}
                                      />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}

                {form.watch("gatingOptions.type") === "addresses" && (
                  <>
                    <div className="w-full h-0.5 bg-brand/25" />
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="gatingOptions.addresses"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex flex-row items-center gap-2">
                              <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                                Whitelisted Addresses
                              </FormLabel>
                              <div className="flex flex-row items-center gap-2">
                                <FormDescription className="hidden sm:block">
                                  Add addresses that are allowed to participate
                                  in the tournament
                                </FormDescription>
                                {addressError && (
                                  <span className="text-red-500 text-sm">
                                    {addressError}
                                  </span>
                                )}
                              </div>
                            </div>
                            <FormControl>
                              <div className="flex flex-col gap-5">
                                <div className="flex gap-2">
                                  <Input
                                    placeholder="Enter address"
                                    value={newAddress}
                                    onChange={(e) =>
                                      setNewAddress(e.target.value)
                                    }
                                  />
                                  <Button
                                    type="button"
                                    onClick={() => {
                                      if (newAddress) {
                                        // Split by comma and trim whitespace
                                        const addresses = newAddress
                                          .split(",")
                                          .map((addr) =>
                                            getChecksumAddress(addr.trim())
                                          )
                                          .filter((addr) => addr.length > 0);

                                        // Validate each address and track invalid ones
                                        const validAddresses: string[] = [];
                                        const invalidAddresses: string[] = [];
                                        const duplicateAddresses: string[] = [];

                                        addresses.forEach((addr) => {
                                          try {
                                            // Check if address is already in the list
                                            if (field.value.includes(addr)) {
                                              duplicateAddresses.push(
                                                displayAddress(addr)
                                              );
                                            }
                                            // Validate the address
                                            else if (
                                              validateChecksumAddress(addr)
                                            ) {
                                              validAddresses.push(addr);
                                            } else {
                                              invalidAddresses.push(addr);
                                            }
                                          } catch (e) {
                                            invalidAddresses.push(addr);
                                          }
                                        });

                                        // Construct error message
                                        let errorMessage = "";
                                        if (invalidAddresses.length > 0) {
                                          errorMessage += `Invalid addresses: ${invalidAddresses.join(
                                            ", "
                                          )}`;
                                        }
                                        if (duplicateAddresses.length > 0) {
                                          if (errorMessage)
                                            errorMessage += ". ";
                                          errorMessage += `Duplicate addresses: ${duplicateAddresses.join(
                                            ", "
                                          )}`;
                                        }

                                        if (validAddresses.length > 0) {
                                          field.onChange([
                                            ...field.value,
                                            ...validAddresses,
                                          ]);
                                          setNewAddress("");
                                          setAddressError(errorMessage);
                                        } else {
                                          setAddressError(
                                            errorMessage ||
                                              "No valid addresses found"
                                          );
                                        }
                                      }
                                    }}
                                  >
                                    Add
                                  </Button>
                                </div>
                                {field.value.length > 0 && (
                                  <>
                                    <div className="w-full h-0.5 bg-brand/25" />
                                    <div className="flex flex-row gap-2 overflow-x-auto">
                                      {field.value.map((address, index) => (
                                        <div
                                          key={index}
                                          className="flex items-center justify-between p-2 border border-neutral rounded w-fit"
                                        >
                                          <span className="truncate">
                                            {displayAddress(address)}
                                          </span>
                                          <span
                                            className="h-4 w-4 hover:cursor-pointer"
                                            onClick={() => {
                                              const newAddresses = [
                                                ...field.value,
                                              ];
                                              newAddresses.splice(index, 1);
                                              field.onChange(newAddresses);
                                            }}
                                          >
                                            <X />
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </FormItem>
      )}
    />
  );
};

export default EntryRequirements;
