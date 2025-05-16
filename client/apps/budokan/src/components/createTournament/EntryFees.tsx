import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StepProps } from "@/containers/CreateTournament";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import AmountInput from "@/components/createTournament/inputs/Amount";
import TokenDialog from "@/components/dialogs/Token";
import { Slider } from "@/components/ui/slider";
import React from "react";
import {
  calculateDistribution,
  formatNumber,
  getOrdinalSuffix,
} from "@/lib/utils";
import { getTokenSymbol } from "@/lib/tokensMeta";
import { useEkuboPrices } from "@/hooks/useEkuboPrices";
import { getTokenLogoUrl } from "@/lib/tokensMeta";
import { OptionalSection } from "@/components/createTournament/containers/OptionalSection";
import { TokenValue } from "@/components/createTournament/containers/TokenValue";
import { useDojo } from "@/context/dojo";

const EntryFees = ({ form }: StepProps) => {
  const { selectedChainConfig } = useDojo();

  const chainId = selectedChainConfig?.chainId ?? "";

  const PREDEFINED_PERCENTAGES = [
    { value: 1, label: "1%" },
    { value: 5, label: "5%" },
    { value: 10, label: "10%" },
  ];

  const [distributionWeight, setDistributionWeight] = React.useState(1);

  const { prices, isLoading: pricesLoading } = useEkuboPrices({
    tokens: [form.watch("entryFees.token")?.symbol ?? ""],
  });

  const creatorFee = form.watch("entryFees.creatorFeePercentage") || 0;
  const gameFee = form.watch("entryFees.gameFeePercentage") || 0;
  const prizeDistribution =
    form
      .watch("entryFees.prizeDistribution")
      ?.reduce((sum, pos) => sum + (pos.percentage || 0), 0) || 0;

  const totalDistributionPercentage = useMemo(() => {
    return creatorFee + gameFee + prizeDistribution;
  }, [creatorFee, gameFee, prizeDistribution]);

  useEffect(() => {
    const distributions = calculateDistribution(
      form.watch("leaderboardSize"),
      distributionWeight,
      creatorFee,
      gameFee
    );
    form.setValue(
      "entryFees.prizeDistribution",
      distributions.map((percentage, index) => ({
        position: index + 1,
        percentage,
      }))
    );
  }, [creatorFee, gameFee, distributionWeight]);

  useEffect(() => {
    form.setValue(
      "entryFees.amount",
      (form.watch("entryFees.value") ?? 0) /
        (prices?.[form.watch("entryFees.token")?.symbol ?? ""] ?? 1)
    );
  }, [form.watch("entryFees.value"), prices]);

  const entryFeeAmountExists = (form.watch("entryFees.amount") ?? 0) > 0;

  return (
    <FormField
      control={form.control}
      name="enableEntryFees"
      render={({ field }) => (
        <FormItem className="flex flex-col sm:p-4">
          <OptionalSection
            label="Entry Fees"
            description="Enable tournament entry fees"
            checked={field.value}
            onCheckedChange={field.onChange}
          />

          {field.value && (
            <>
              <div className="w-full h-0.5 bg-brand/25" />
              <div className="space-y-4">
                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="entryFees.token"
                    render={({ field: tokenField }) => (
                      <FormItem>
                        <FormControl>
                          <div className="flex justify-center sm:justify-start pt-4 sm:pt-6">
                            <TokenDialog
                              selectedToken={form.watch("entryFees.token")}
                              onSelect={(token) => {
                                tokenField.onChange(token);
                              }}
                              type="erc20"
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="w-full h-0.5 bg-brand/25 sm:hidden" />
                  <FormField
                    control={form.control}
                    name="entryFees.value"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-row items-center gap-5">
                            <FormLabel className="text-lg font-brand">
                              Amount ($)
                            </FormLabel>
                            <FormDescription className="hidden sm:block sm:text-xs xl:text-sm">
                              Prize amount in USD
                            </FormDescription>
                            <TokenValue
                              className="sm:hidden"
                              amount={form.watch("entryFees.amount") ?? 0}
                              tokenAddress={
                                form.watch("entryFees.token")?.address ?? ""
                              }
                              usdValue={form.watch("entryFees.value") ?? 0}
                              isLoading={pricesLoading}
                            />
                          </div>
                        </div>
                        <FormControl>
                          <div className="flex flex-row items-center gap-2">
                            <AmountInput
                              value={field.value || 0}
                              onChange={field.onChange}
                            />
                            <TokenValue
                              className="hidden sm:flex"
                              amount={form.watch("entryFees.amount") ?? 0}
                              tokenAddress={
                                form.watch("entryFees.token")?.address ?? ""
                              }
                              usdValue={form.watch("entryFees.value") ?? 0}
                              isLoading={pricesLoading}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-full h-0.5 bg-brand/25" />
                <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="entryFees.creatorFeePercentage"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-row items-center gap-5">
                          <FormLabel className="font-brand text-lg">
                            Creator Fee (%)
                          </FormLabel>
                          <FormDescription className="hidden sm:block sm:text-xs xl:text-sm">
                            Fee provided to the tournament creator
                          </FormDescription>
                          <TokenValue
                            className="sm:hidden"
                            amount={
                              ((form.watch("entryFees.amount") ?? 0) *
                                (field.value ?? 0)) /
                              100
                            }
                            tokenAddress={
                              form.watch("entryFees.token")?.address ?? ""
                            }
                            usdValue={
                              ((form.watch("entryFees.value") ?? 0) *
                                (field.value ?? 0)) /
                              100
                            }
                            isLoading={pricesLoading}
                          />
                        </div>
                        <FormControl>
                          <div className="div flex flex-row gap-2">
                            <div className="flex flex-row gap-2">
                              {PREDEFINED_PERCENTAGES.map(
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
                            <Input
                              type="number"
                              placeholder="0"
                              className="w-[80px] p-1"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                            <TokenValue
                              className="hidden sm:flex"
                              amount={
                                ((form.watch("entryFees.amount") ?? 0) *
                                  (field.value ?? 0)) /
                                100
                              }
                              tokenAddress={
                                form.watch("entryFees.token")?.address ?? ""
                              }
                              usdValue={
                                ((form.watch("entryFees.value") ?? 0) *
                                  (field.value ?? 0)) /
                                100
                              }
                              isLoading={pricesLoading}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="w-full h-0.5 bg-brand/25 sm:hidden" />
                  <FormField
                    control={form.control}
                    name="entryFees.gameFeePercentage"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex flex-row items-center gap-5">
                          <FormLabel className="font-brand text-lg">
                            Game Fee (%)
                          </FormLabel>
                          <FormDescription className="hidden sm:block sm:text-xs xl:text-sm">
                            Fee provided to the game creator
                          </FormDescription>
                          <TokenValue
                            className="sm:hidden"
                            amount={
                              ((form.watch("entryFees.amount") ?? 0) *
                                (field.value ?? 0)) /
                              100
                            }
                            tokenAddress={
                              form.watch("entryFees.token")?.address ?? ""
                            }
                            usdValue={
                              ((form.watch("entryFees.value") ?? 0) *
                                (field.value ?? 0)) /
                              100
                            }
                            isLoading={pricesLoading}
                          />
                        </div>
                        <FormControl>
                          <div className="div flex flex-row gap-2">
                            <div className="flex flex-row gap-2">
                              {PREDEFINED_PERCENTAGES.map(
                                ({ value, label }) => (
                                  <Button
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
                            <Input
                              type="number"
                              placeholder="0"
                              className="w-[80px] p-1"
                              {...field}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value))
                              }
                            />
                            <TokenValue
                              className="hidden sm:flex"
                              amount={
                                ((form.watch("entryFees.amount") ?? 0) *
                                  (field.value ?? 0)) /
                                100
                              }
                              tokenAddress={
                                form.watch("entryFees.token")?.address ?? ""
                              }
                              usdValue={
                                ((form.watch("entryFees.value") ?? 0) *
                                  (field.value ?? 0)) /
                                100
                              }
                              isLoading={pricesLoading}
                            />
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="w-full h-0.5 bg-brand/25" />
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between">
                    <div className="flex flex-row items-center gap-5">
                      <FormLabel className="font-brand text-lg">
                        Prize Distribution
                      </FormLabel>
                      <FormDescription className="hidden sm:block sm:text-xs xl:text-sm">
                        Set prize percentages for each position
                      </FormDescription>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-row gap-2 items-center justify-between text-sm text-muted-foreground">
                        <div className="flex flex-row items-center gap-2">
                          <FormLabel>Distribution Weight</FormLabel>
                          <FormDescription className="hidden sm:block sm:text-xs xl:text-sm">
                            Adjust the spread of the distribution
                          </FormDescription>
                        </div>
                        {totalDistributionPercentage !== 100 && (
                          <span className="text-destructive">
                            Total must equal 100%
                          </span>
                        )}
                      </div>
                      <div className="flex flex-row items-center gap-4">
                        <Slider
                          min={0}
                          max={5}
                          step={0.1}
                          value={[distributionWeight]}
                          onValueChange={([value]) => {
                            setDistributionWeight(value);
                            const creatorFee =
                              form.watch("entryFees.creatorFeePercentage") || 0;
                            const gameFee =
                              form.watch("entryFees.gameFeePercentage") || 0;
                            const distributions = calculateDistribution(
                              form.watch("leaderboardSize"),
                              value,
                              creatorFee,
                              gameFee
                            );
                            form.setValue(
                              "entryFees.prizeDistribution",
                              distributions.map((percentage, index) => ({
                                position: index + 1,
                                percentage,
                              }))
                            );
                          }}
                          className="w-[200px]"
                        />
                        <span className="w-12 text-center">
                          {distributionWeight.toFixed(1)}
                        </span>
                        <div className="flex flex-row gap-2 items-center justify-between text-sm text-muted-foreground">
                          <span>Total: {totalDistributionPercentage}%</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full">
                    <div className="flex flex-col items-center sm:flex-row gap-4 overflow-x-auto pb-2">
                      {Array.from({
                        length: form.watch("leaderboardSize"),
                      }).map((_, index) => (
                        <FormField
                          key={index}
                          control={form.control}
                          name={`entryFees.prizeDistribution.${index}.percentage`}
                          render={({ field }) => (
                            <FormItem className="w-[175px] min-w-[175px] flex flex-row items-center justify-between flex-shrink-0 border border-neutral rounded-md p-2 space-y-0">
                              <FormLabel>
                                <span className="font-brand text-lg">
                                  {index + 1}
                                  {getOrdinalSuffix(index + 1)}
                                </span>
                              </FormLabel>
                              <FormControl>
                                <>
                                  <div className="relative w-[50px] flex flex-row items-center gap-2">
                                    <Input
                                      type="number"
                                      {...field}
                                      min="0"
                                      max="100"
                                      className="pr-4 px-1"
                                      onChange={(e) => {
                                        const value = Number(e.target.value);
                                        field.onChange(value);
                                      }}
                                    />
                                    <span className="absolute right-1 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                                      %
                                    </span>
                                  </div>
                                  {entryFeeAmountExists && (
                                    <div className="flex flex-col">
                                      <div className="flex flex-row items-center gap-2">
                                        <span className="text-xs">
                                          {formatNumber(
                                            ((form.watch(
                                              `entryFees.prizeDistribution.${index}.percentage`
                                            ) ?? 0) *
                                              (form.watch("entryFees.amount") ??
                                                0)) /
                                              100
                                          )}
                                        </span>
                                        <img
                                          src={getTokenLogoUrl(
                                            chainId,
                                            form.watch("entryFees.token")
                                              ?.address ?? ""
                                          )}
                                          className="w-3"
                                        />
                                      </div>
                                      {prices?.[
                                        getTokenSymbol(
                                          chainId,
                                          form.watch("entryFees.token")
                                            ?.address ?? ""
                                        ) ?? ""
                                      ] && (
                                        <span className="text-xs text-neutral">
                                          ~$
                                          {(
                                            ((form.watch(
                                              `entryFees.prizeDistribution.${index}.percentage`
                                            ) ?? 0) *
                                              (form.watch("entryFees.value") ??
                                                0)) /
                                            100
                                          ).toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </FormItem>
      )}
    />
  );
};

export default EntryFees;
