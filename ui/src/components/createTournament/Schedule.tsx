import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { StepProps } from "@/containers/CreateTournament";
import TournamentTimeline from "@/components/TournamentTimeline";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { INFO } from "@/components/Icons";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { CALENDAR } from "@/components/Icons";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SECONDS_IN_DAY, SECONDS_IN_HOUR } from "@/lib/constants";
import { Input } from "../ui/input";
import { useDojo } from "@/context/dojo";
import { ChainId } from "@/dojo/config";

const Schedule = ({ form }: StepProps) => {
  const { selectedChainConfig } = useDojo();
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const PREDEFINED_DURATIONS = [
    { value: 86400, label: "1D" },
    { value: 259200, label: "3D" },
    { value: 604800, label: "1W" },
    { value: 1209600, label: "2W" },
  ];

  const DURATION_TO_DEFAULT_SUBMISSION = {
    "1D": 3600, // 1 day -> 1 hour
    "3D": 21600, // 3 days -> 6 hours
    "1W": 86400, // 1 week -> 1 day (24 hours)
    "2W": 172800, // 2 weeks -> 2 days (48 hours)
  } as const;

  const disablePastDates = (date: Date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return date < now;
  };

  const submissionHours = form.watch("submissionPeriod") / (60 * 60);
  const durationDays = form.watch("duration") / (24 * 60 * 60);

  const isMainnet = selectedChainConfig.chainId === ChainId.SN_MAIN;

  return (
    <>
      <div className="flex flex-col gap-5 lg:p-2 2xl:p-4">
        <div className="flex flex-col">
          <span className="font-brand text-lg sm:text-xl lg:text-2xl 2xl:text-3xl 3xl:text-4xl font-bold">
            Schedule
          </span>
          <div className="w-full h-0.5 bg-brand/25" />
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0 sm:px-4">
          <div className="w-full sm:w-2/5">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem className="flex flex-col justify-center h-full gap-2 sm:gap-4">
                  <div className="flex flex-row items-center gap-4">
                    <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                      Start Time
                    </FormLabel>

                    <FormDescription className="sm:text-xs xl:text-sm 3xl:text-base">
                      Select a future time
                    </FormDescription>
                  </div>

                  <div className="flex flex-row justify-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="xl"
                          className="justify-start text-left font-normal"
                        >
                          <CALENDAR />
                          {field.value ? (
                            format(field.value, "PPP HH:mm")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          selected={field.value}
                          onSelect={(date) => {
                            if (date) {
                              const newDate = new Date(date);
                              const currentValue = field.value;
                              newDate.setHours(currentValue.getHours());
                              newDate.setMinutes(currentValue.getMinutes());
                              field.onChange(newDate);
                            }
                          }}
                          selectedTime={field.value}
                          onTimeChange={(hour, minute) => {
                            const newDate = new Date(field.value);
                            newDate.setHours(hour);
                            newDate.setMinutes(minute);
                            field.onChange(newDate);
                          }}
                          disabled={disablePastDates}
                          initialFocus
                          className="rounded-md border-4 border-brand-muted w-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="w-full h-0.5 bg-brand/25 sm:hidden" />
          <div className="flex flex-col gap-4 w-full sm:w-3/5">
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-row items-center gap-4">
                      <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                        Duration
                      </FormLabel>
                      <FormDescription className="sm:text-xs xl:text-sm 3xl:text-base">
                        Select the tournament duration and submission period
                      </FormDescription>
                    </div>
                    <FormControl>
                      {/* Duration Section */}
                      <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-8 xl:gap-0">
                        <div
                          className={`flex flex-row items-center justify-center sm:justify-start gap-2 w-full ${
                            isMainnet ? "sm:w-2/3" : "sm:w-3/5"
                          }`}
                        >
                          {PREDEFINED_DURATIONS.map(({ value, label }) => (
                            <Button
                              key={value}
                              type="button"
                              variant={
                                field.value === value ? "default" : "outline"
                              }
                              className="px-2"
                              onClick={() => {
                                field.onChange(value);

                                // Find the duration object with the matching value
                                const selectedDuration =
                                  PREDEFINED_DURATIONS.find(
                                    (duration) => duration.value === value
                                  );

                                // Get the label from the found duration object
                                const durationLabel = selectedDuration?.label;

                                // Use the label to get the default submission period
                                if (
                                  durationLabel &&
                                  DURATION_TO_DEFAULT_SUBMISSION[
                                    durationLabel as keyof typeof DURATION_TO_DEFAULT_SUBMISSION
                                  ]
                                ) {
                                  form.setValue(
                                    "submissionPeriod",
                                    DURATION_TO_DEFAULT_SUBMISSION[
                                      durationLabel as keyof typeof DURATION_TO_DEFAULT_SUBMISSION
                                    ]
                                  );
                                } else {
                                  // Fallback to a default value if no mapping is found
                                  form.setValue("submissionPeriod", 3600); // Default to 1 hour
                                }
                              }}
                            >
                              {label}
                            </Button>
                          ))}
                          {!isMainnet && (
                            <div className="flex flex-col gap-1">
                              <Label className="text-xs font-medium">
                                Custom (seconds)
                              </Label>
                              <Input
                                className="w-24 px-1"
                                type="number"
                                value={field.value}
                                onChange={(e) => {
                                  field.onChange(Number(e.target.value));
                                  form.setValue(
                                    "submissionPeriod",
                                    Number(e.target.value)
                                  );
                                }}
                                min={900}
                              />
                            </div>
                          )}
                        </div>
                        <div
                          className={`flex flex-row gap-2 w-full ${
                            isMainnet ? "sm:w-2/3" : "sm:w-2/5"
                          }`}
                        >
                          <div className="flex flex-col gap-2 w-1/2">
                            <div className="flex justify-between items-center">
                              <Label className="xl:text-xs 2xl:text-sm font-medium">
                                Duration
                              </Label>
                              <span className="text-sm text-muted-foreground xl:text-xs 2xl:text-sm">
                                {Number.isInteger(durationDays)
                                  ? durationDays
                                  : durationDays.toFixed(2)}{" "}
                                {durationDays === 1 ? "day" : "days"}
                              </span>
                            </div>
                            <Slider
                              value={[field.value]}
                              onValueChange={([duration]) => {
                                field.onChange(duration);
                              }}
                              max={7776000}
                              min={SECONDS_IN_DAY}
                              step={SECONDS_IN_DAY}
                            />
                          </div>

                          {/* Submission Period Section */}
                          <div className="flex flex-col gap-2 w-1/2">
                            <div className="flex justify-between items-center">
                              <Label className="xl:text-xs 2xl:text-sm font-medium">
                                Submission{" "}
                              </Label>
                              <span className="text-sm text-muted-foreground xl:text-xs 2xl:text-sm">
                                {Number.isInteger(submissionHours)
                                  ? submissionHours
                                  : submissionHours.toFixed(2)}{" "}
                                {submissionHours === 1 ? "hour" : "hours"}
                              </span>
                            </div>
                            <Slider
                              value={[form.watch("submissionPeriod") || 1]}
                              onValueChange={([submissionHours]) => {
                                form.setValue(
                                  "submissionPeriod",
                                  submissionHours
                                );
                              }}
                              max={field.value}
                              min={SECONDS_IN_HOUR}
                              step={SECONDS_IN_HOUR}
                            />
                          </div>
                        </div>
                      </div>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="w-full h-0.5 bg-brand/25" />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-row items-center gap-4">
                      <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
                        Registration Type
                      </FormLabel>
                      <div className="flex flex-row gap-2 relative">
                        <FormDescription className="hidden sm:block text-wrap sm:text-xs xl:text-sm 3xl:text-base">
                          Select the registration type for the tournament
                        </FormDescription>
                        <div className="hidden sm:block">
                          <HoverCard openDelay={50} closeDelay={0}>
                            <HoverCardTrigger asChild>
                              <span className="absolute -top-4 -right-8 w-6 h-6 cursor-pointer">
                                <INFO />
                              </span>
                            </HoverCardTrigger>
                            <HoverCardContent className="w-64 xl:w-80 p-4 text-sm z-50">
                              <div className="flex flex-col gap-2">
                                <h4 className="text-lg">Registration Types</h4>
                                <ul className="list-disc pl-4 space-y-2">
                                  <li className="text-muted-foreground text-wrap">
                                    <span className="font-medium text-brand">
                                      Fixed:
                                    </span>{" "}
                                    <span className="text-neutral">
                                      An event with a registration period for
                                      capped number of entries.
                                    </span>
                                  </li>
                                  <li className="text-muted-foreground text-wrap">
                                    <span className="font-medium text-brand">
                                      Open:
                                    </span>{" "}
                                    <span className="text-neutral">
                                      An event where entries can be made
                                      throughout the tournament period.
                                    </span>
                                  </li>
                                </ul>
                              </div>
                            </HoverCardContent>
                          </HoverCard>
                        </div>
                        <div
                          className="sm:hidden absolute -top-4 -right-8 w-6 h-6 cursor-pointer"
                          onClick={() => setIsMobileDialogOpen(true)}
                        >
                          <INFO />
                        </div>
                      </div>
                    </div>
                    <FormControl>
                      <div className="flex justify-center sm:justify-start gap-2">
                        <Button
                          type="button"
                          variant={
                            field.value === "fixed" ? "default" : "outline"
                          }
                          onClick={() => field.onChange("fixed")}
                        >
                          Fixed
                        </Button>
                        <Button
                          type="button"
                          variant={
                            field.value === "open" ? "default" : "outline"
                          }
                          onClick={() => field.onChange("open")}
                        >
                          Open
                        </Button>
                      </div>
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />
            <div className="w-full h-0.5 bg-brand/25 mb-4 sm:mb-0" />
            <TournamentTimeline
              type={form.watch("type")}
              createdTime={Math.floor(new Date().getTime() / 1000)} // Convert to Unix timestamp
              startTime={Math.floor(form.watch("startTime").getTime() / 1000)} // Convert to Unix timestamp
              duration={form.watch("duration")}
              submissionPeriod={form.watch("submissionPeriod")}
            />
          </div>
        </div>
      </div>
      <Dialog open={isMobileDialogOpen} onOpenChange={setIsMobileDialogOpen}>
        <DialogContent className="sm:hidden bg-black border border-brand p-4 rounded-lg max-w-[90vw] mx-auto">
          <div className="flex flex-col gap-4 justify-between items-center mb-4">
            <h3 className="font-brand text-lg text-brand">
              Registration Types
            </h3>
            <ul className="list-disc pl-4 space-y-2">
              <li className="text-muted-foreground text-wrap">
                <span className="font-medium text-brand">Fixed:</span>{" "}
                <span className="text-neutral">
                  An event with a registration period for capped number of
                  entries.
                </span>
              </li>
              <li className="text-muted-foreground text-wrap">
                <span className="font-medium text-brand">Open:</span>{" "}
                <span className="text-neutral">
                  An event where entries can be made throughout the tournament
                  period.
                </span>
              </li>
            </ul>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Schedule;
