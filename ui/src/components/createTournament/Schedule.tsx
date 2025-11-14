import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { StepProps } from "@/containers/CreateTournament";
import ScheduleSlider from "@/components/createTournament/ScheduleSlider";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card";
import { INFO } from "@/components/Icons";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SECONDS_IN_DAY } from "@/lib/constants";

const Schedule = ({ form }: StepProps) => {
  const [isMobileDialogOpen, setIsMobileDialogOpen] = useState(false);
  const [enableRegistration, setEnableRegistration] = useState(false);
  const [minStartTime, setMinStartTime] = useState<Date>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 15);
    return now;
  });
  const [minEndTime, setMinEndTime] = useState<Date>(() => {
    const startTime = form.watch("startTime");
    startTime.setMinutes(startTime.getMinutes() + 15);
    return startTime;
  });

  const PREDEFINED_DURATIONS = [
    { value: 86400, label: "1D" },
    { value: 259200, label: "3D" },
    { value: 604800, label: "1W" },
    { value: 1209600, label: "2W" },
  ];

  const DURATION_TO_DEFAULT_SUBMISSION = {
    "1D": 86400, // 1 day -> 1 day (24 hours)
    "3D": 86400, // 3 days -> 1 day (24 hours)
    "1W": 86400, // 1 week -> 1 day (24 hours)
    "2W": 172800, // 2 weeks -> 2 days (48 hours)
  } as const;

  // Updated function to disable dates before the minimum start time
  const disablePastStartDates = (date: Date) => {
    const minDate = new Date(minStartTime);
    minDate.setHours(0, 0, 0, 0);
    return date < minDate;
  };

  const disablePastEndDates = (date: Date) => {
    const minDate = new Date(minEndTime);
    minDate.setHours(0, 0, 0, 0);
    return date < minDate;
  };

  const registrationType = form.watch("type");

  // Sync enableRegistration state with form's registration type
  useEffect(() => {
    setEnableRegistration(registrationType === "fixed");
  }, [registrationType]);

  // Effect to update start time when registration type changes to "fixed"
  useEffect(() => {
    if (registrationType === "fixed") {
      // Get current time
      const now = new Date();

      // Calculate minutes to the next 5-minute interval
      const currentMinutes = now.getMinutes();
      const remainder = currentMinutes % 5;
      const minutesToAdd = remainder === 0 ? 15 : 5 - remainder + 15;

      // Create new date with rounded minutes plus 15 minutes
      const roundedFifteenMinutesFromNow = new Date(now);
      roundedFifteenMinutesFromNow.setMinutes(now.getMinutes() + minutesToAdd);
      roundedFifteenMinutesFromNow.setSeconds(0);
      roundedFifteenMinutesFromNow.setMilliseconds(0);

      // Update the form's start time
      form.setValue("startTime", roundedFifteenMinutesFromNow);

      // Update the minimum start time
      setMinStartTime(roundedFifteenMinutesFromNow);
    }
  }, [registrationType, form]);

  const startTime = form.watch("startTime");

  useEffect(() => {
    // Get current end time from form
    const currentEndTime = form.watch("endTime");

    // Calculate minimum required end time (start time + 15 minutes)
    const minRequiredEndTime = new Date(startTime);
    minRequiredEndTime.setMinutes(startTime.getMinutes() + 15);
    minRequiredEndTime.setSeconds(0);
    minRequiredEndTime.setMilliseconds(0);

    // Update minEndTime for the calendar validation
    setMinEndTime(minRequiredEndTime);

    // Only update the end time if it's before the minimum required time
    if (!currentEndTime || currentEndTime < minRequiredEndTime) {
      // Set default end time to EXACTLY 1 day ahead
      const oneDayFromStartTime = new Date(startTime);

      // Set to exactly 24 hours (1 day) later
      oneDayFromStartTime.setTime(startTime.getTime() + 24 * 60 * 60 * 1000);

      // Ensure seconds and milliseconds are zero
      oneDayFromStartTime.setSeconds(0);
      oneDayFromStartTime.setMilliseconds(0);

      // Update the form's end time
      form.setValue("endTime", oneDayFromStartTime);
    }
  }, [startTime, form]);

  // Update duration based on start and end times
  useEffect(() => {
    const startTime = form.watch("startTime");
    const endTime = form.watch("endTime");

    if (startTime && endTime && endTime > startTime) {
      // Calculate duration in seconds
      const durationInSeconds = Math.floor(
        (endTime.getTime() - startTime.getTime()) / 1000
      );

      // Only update if it's a valid duration (at least 15 minutes)
      if (durationInSeconds >= 900) {
        form.setValue("duration", durationInSeconds);

        // Always enforce minimum 24-hour submission period
        const currentSubmissionPeriod = form.watch("submissionPeriod");
        if (currentSubmissionPeriod < SECONDS_IN_DAY) {
          form.setValue("submissionPeriod", SECONDS_IN_DAY);
        }
      }
    }
  }, [form.watch("endTime"), form]);

  useEffect(() => {
    const startTime = form.watch("startTime");
    const duration = form.watch("duration");

    if (startTime && duration) {
      // Calculate new end time based on start time + duration
      const newEndTime = new Date(startTime.getTime() + duration * 1000);

      // Update the form's end time
      form.setValue("endTime", newEndTime);
    }
  }, [form.watch("duration"), form]);

  return (
    <>
      <div className="flex flex-col gap-5 lg:p-2 2xl:p-4">
        <div className="flex flex-col">
          <span className="font-brand text-lg sm:text-xl lg:text-2xl 2xl:text-3xl 3xl:text-4xl font-bold">
            Schedule
          </span>
          <div className="w-full h-0.5 bg-brand/25" />
        </div>

        {/* Registration Type Selector */}
        <div className="flex flex-col gap-4 px-4">
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
                                    Open:
                                  </span>{" "}
                                  <span className="text-neutral">
                                    An event where entries can be made
                                    throughout the tournament period.
                                  </span>
                                </li>
                                <li className="text-muted-foreground text-wrap">
                                  <span className="font-medium text-brand">
                                    Fixed:
                                  </span>{" "}
                                  <span className="text-neutral">
                                    An event with a registration period for
                                    capped number of entries.
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
                          field.value === "open" ? "default" : "outline"
                        }
                        onClick={() => field.onChange("open")}
                      >
                        Open
                      </Button>
                      <Button
                        type="button"
                        variant={
                          field.value === "fixed" ? "default" : "outline"
                        }
                        onClick={() => field.onChange("fixed")}
                      >
                        Fixed
                      </Button>
                    </div>
                  </FormControl>
                </div>
              </FormItem>
            )}
          />
          <div className="w-full h-0.5 bg-brand/25" />
        </div>

        {/* Interactive Schedule Slider */}
        <div className="px-4">
          <div className="flex flex-row items-center gap-4 mb-6">
            <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
              Timeline
            </FormLabel>
            <FormDescription className="sm:text-xs xl:text-sm 3xl:text-base">
              Drag the timeline points or click icons to adjust dates
            </FormDescription>
          </div>
          <ScheduleSlider
            startTime={form.watch("startTime")}
            endTime={form.watch("endTime")}
            submissionPeriod={form.watch("submissionPeriod")}
            enableRegistration={enableRegistration}
            registrationType={form.watch("type")}
            onStartTimeChange={(date) => form.setValue("startTime", date)}
            onEndTimeChange={(date) => form.setValue("endTime", date)}
            onSubmissionPeriodChange={(seconds) =>
              form.setValue("submissionPeriod", seconds)
            }
            minStartTime={minStartTime}
            minEndTime={minEndTime}
            disablePastStartDates={disablePastStartDates}
            disablePastEndDates={disablePastEndDates}
          />
        </div>

        {/* Quick Presets */}
        <div className="flex flex-col gap-4 px-4">
          <div className="flex flex-row items-center gap-4">
            <FormLabel className="font-brand text-lg xl:text-xl 2xl:text-2xl 3xl:text-3xl">
              Quick Presets
            </FormLabel>
            <FormDescription className="sm:text-xs xl:text-sm 3xl:text-base">
              Select a preset duration
            </FormDescription>
          </div>
          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="flex flex-row items-center justify-center sm:justify-start gap-2">
                    {PREDEFINED_DURATIONS.map(({ value, label }) => (
                      <Button
                        key={value}
                        type="button"
                        variant={field.value === value ? "default" : "outline"}
                        className="px-4"
                        onClick={() => {
                          field.onChange(value);

                          const selectedDuration = PREDEFINED_DURATIONS.find(
                            (duration) => duration.value === value
                          );
                          const durationLabel = selectedDuration?.label;

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
                            form.setValue("submissionPeriod", SECONDS_IN_DAY);
                          }
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="w-full h-0.5 bg-brand/25" />
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
