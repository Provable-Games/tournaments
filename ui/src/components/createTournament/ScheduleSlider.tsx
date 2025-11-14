import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CALENDAR, START_FLAG, END_FLAG, LEADERBOARD, REGISTER } from "@/components/Icons";
import { SECONDS_IN_DAY, SECONDS_IN_HOUR } from "@/lib/constants";

const SECONDS_IN_15_MINUTES = 15 * 60;

interface ScheduleSliderProps {
  startTime: Date;
  endTime: Date;
  submissionPeriod: number;
  enableRegistration: boolean;
  registrationType: "open" | "fixed";
  onStartTimeChange: (date: Date) => void;
  onEndTimeChange: (date: Date) => void;
  onSubmissionPeriodChange: (seconds: number) => void;
  minStartTime: Date;
  minEndTime: Date;
  disablePastStartDates: (date: Date) => boolean;
  disablePastEndDates: (date: Date) => boolean;
}

const ScheduleSlider = ({
  startTime,
  endTime,
  submissionPeriod,
  enableRegistration,
  registrationType,
  onStartTimeChange,
  onEndTimeChange,
  onSubmissionPeriodChange,
  minStartTime,
  minEndTime,
  disablePastStartDates,
  disablePastEndDates,
}: ScheduleSliderProps) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [sliderWidth, setSliderWidth] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);

  // Calculate total timeline duration in seconds (with safety checks)
  const now = new Date();

  // For "open" registration, registration and tournament happen simultaneously
  const registrationDuration = enableRegistration && startTime
    ? Math.max(0, Math.floor((startTime.getTime() - now.getTime()) / 1000))
    : 0;

  const tournamentDuration = startTime && endTime
    ? Math.max(SECONDS_IN_15_MINUTES, Math.floor((endTime.getTime() - startTime.getTime()) / 1000))
    : SECONDS_IN_DAY;

  // For open tournaments, registration overlaps with tournament
  const totalDuration = registrationType === "open"
    ? tournamentDuration + (submissionPeriod || SECONDS_IN_DAY)
    : registrationDuration + tournamentDuration + (submissionPeriod || SECONDS_IN_DAY);

  // Calculate positions as percentages
  const registrationStart = 0;
  const registrationEnd = registrationType === "fixed" && enableRegistration
    ? (registrationDuration / totalDuration) * 100
    : 0;
  const tournamentStart = registrationEnd;
  const tournamentEnd = registrationType === "open"
    ? (tournamentDuration / totalDuration) * 100
    : ((registrationDuration + tournamentDuration) / totalDuration) * 100;
  const submissionEnd = 100;

  useEffect(() => {
    const updateWidth = () => {
      if (sliderRef.current) {
        setSliderWidth(sliderRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const handleMouseDown = (point: string, e: React.MouseEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    setDragStartX(e.clientX - rect.left);
    setIsDragging(point);
  };

  const handleSegmentDrag = (segment: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    setDragStartX(e.clientX - rect.left);
    setIsDragging(segment + "-segment");
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !sliderRef.current || !startTime || !endTime) return;

    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;

    // Convert percentage to duration in seconds
    const newDurationFromStart = Math.floor((percentage / 100) * totalDuration);

    if (isDragging === "registration" && registrationType === "fixed") {
      // Dragging registration end point (tournament start)
      const registrationTime = Math.max(
        SECONDS_IN_15_MINUTES,
        newDurationFromStart
      );
      const newStartTime = new Date(now.getTime() + registrationTime * 1000);

      // Ensure start time respects minimum constraint
      if (newStartTime >= minStartTime) {
        onStartTimeChange(newStartTime);
      }
    } else if (isDragging === "tournament") {
      // Dragging tournament end point
      const durationFromStart = registrationType === "fixed"
        ? newDurationFromStart - registrationDuration
        : newDurationFromStart;
      const newDuration = Math.max(SECONDS_IN_15_MINUTES, durationFromStart);
      const newEndTime = new Date(startTime.getTime() + newDuration * 1000);

      if (newEndTime >= minEndTime) {
        onEndTimeChange(newEndTime);
      }
    } else if (isDragging === "submission") {
      // Dragging submission end point
      const submissionStart = registrationType === "fixed"
        ? registrationDuration + tournamentDuration
        : tournamentDuration;
      const submissionDuration = Math.max(
        SECONDS_IN_DAY,
        newDurationFromStart - submissionStart
      );
      onSubmissionPeriodChange(submissionDuration);
    } else if (isDragging === "tournament-segment") {
      // Dragging the entire tournament segment (shifts both start and end)
      const delta = x - dragStartX;
      const deltaSeconds = Math.floor((delta / rect.width) * totalDuration);

      const newStartTime = new Date(startTime.getTime() + deltaSeconds * 1000);
      const newEndTime = new Date(endTime.getTime() + deltaSeconds * 1000);

      if (newStartTime >= minStartTime && newEndTime >= minEndTime) {
        onStartTimeChange(newStartTime);
        onEndTimeChange(newEndTime);
        setDragStartX(x);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, totalDuration, registrationDuration, tournamentDuration]);

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / SECONDS_IN_DAY);
    const hours = Math.floor((seconds % SECONDS_IN_DAY) / SECONDS_IN_HOUR);

    if (days > 0) {
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
    return `${hours}h`;
  };

  const submissionEndDate = endTime
    ? new Date(endTime.getTime() + submissionPeriod * 1000)
    : new Date();

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Timeline Slider */}
      <div className="relative pt-20 pb-8" ref={sliderRef}>
        {/* Slider Track */}
        <div className="relative h-4 w-full rounded-full bg-neutral/20">
          {/* Registration Segment */}
          {registrationType === "fixed" && enableRegistration && (
            <div
              className="absolute h-full bg-purple-500/60 rounded-l-full cursor-grab active:cursor-grabbing hover:bg-purple-500/80 transition-colors"
              style={{
                left: `${registrationStart}%`,
                width: `${registrationEnd - registrationStart}%`,
              }}
              onMouseDown={(e) => handleSegmentDrag("registration", e)}
              title="Drag to adjust registration period"
            />
          )}

          {/* Tournament Duration Segment */}
          <div
            className={`absolute h-full bg-brand-muted/80 cursor-grab active:cursor-grabbing hover:bg-brand-muted transition-colors ${
              registrationType === "fixed" && !enableRegistration ? "rounded-l-full" : ""
            }`}
            style={{
              left: `${registrationEnd}%`,
              width: `${tournamentEnd - registrationEnd}%`,
            }}
            onMouseDown={(e) => handleSegmentDrag("tournament", e)}
            title="Drag to shift tournament"
          />

          {/* Submission Period Segment */}
          <div
            className="absolute h-full bg-blue-500/60 rounded-r-full cursor-grab active:cursor-grabbing hover:bg-blue-500/80 transition-colors"
            style={{
              left: `${tournamentEnd}%`,
              width: `${submissionEnd - tournamentEnd}%`,
            }}
            onMouseDown={(e) => handleSegmentDrag("submission", e)}
            title="Drag to adjust submission period"
          />

          {/* Draggable Points and Icons */}

          {/* Now Point (Start of timeline) */}
          {enableRegistration && (
            <div
              className="absolute -top-16 transform -translate-x-1/2 flex flex-col items-center gap-2"
              style={{ left: `${registrationStart}%` }}
            >
              <div className="w-10 h-10 rounded-full bg-brand border-2 border-neutral flex items-center justify-center cursor-default">
                <span className="w-6">
                  <CALENDAR />
                </span>
              </div>
              <div className="text-xs font-brand text-center">
                <div>{format(now, "dd/MM")}</div>
                <div>{format(now, "HH:mm")}</div>
              </div>
              <div className="text-xs text-brand-muted font-medium">Now</div>
            </div>
          )}

          {/* Tournament Start Point */}
          <div
            className="absolute -top-16 transform -translate-x-1/2 flex flex-col items-center gap-2"
            style={{ left: `${registrationEnd}%` }}
          >
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className={`w-10 h-10 rounded-full bg-brand border-2 border-neutral flex items-center justify-center transition-all ${
                    enableRegistration
                      ? "cursor-grab active:cursor-grabbing hover:scale-110"
                      : "cursor-pointer hover:scale-110"
                  }`}
                  onMouseDown={(e) => {
                    if (enableRegistration) {
                      e.preventDefault();
                      handleMouseDown("registration", e);
                    }
                  }}
                >
                  <span className="w-4">
                    <START_FLAG />
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  selected={startTime}
                  onSelect={(date) => {
                    if (date && startTime) {
                      const newDate = new Date(date);
                      newDate.setHours(startTime.getHours());
                      newDate.setMinutes(startTime.getMinutes());
                      onStartTimeChange(newDate);
                    }
                  }}
                  selectedTime={startTime}
                  onTimeChange={(hour, minute) => {
                    if (startTime) {
                      const newDate = new Date(startTime);
                      newDate.setHours(hour);
                      newDate.setMinutes(minute);
                      onStartTimeChange(newDate);
                    }
                  }}
                  disabled={disablePastStartDates}
                  minTime={minStartTime}
                  initialFocus
                  className="rounded-md border-4 border-brand-muted w-auto"
                />
              </PopoverContent>
            </Popover>
            <div className="text-xs font-brand text-center">
              <div>{startTime ? format(startTime, "dd/MM") : "--/--"}</div>
              <div>{startTime ? format(startTime, "HH:mm") : "--:--"}</div>
            </div>
            <div className="text-xs text-brand-muted font-medium">Start</div>
          </div>

          {/* Tournament End Point */}
          <div
            className="absolute -top-16 transform -translate-x-1/2 flex flex-col items-center gap-2"
            style={{ left: `${tournamentEnd}%` }}
          >
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="w-10 h-10 rounded-full bg-brand border-2 border-neutral flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-all"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleMouseDown("tournament", e);
                  }}
                >
                  <span className="w-4">
                    <END_FLAG />
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="center">
                <Calendar
                  selected={endTime}
                  onSelect={(date) => {
                    if (date && endTime) {
                      const newDate = new Date(date);
                      newDate.setHours(endTime.getHours());
                      newDate.setMinutes(endTime.getMinutes());
                      onEndTimeChange(newDate);
                    }
                  }}
                  selectedTime={endTime}
                  onTimeChange={(hour, minute) => {
                    if (endTime) {
                      const newDate = new Date(endTime);
                      newDate.setHours(hour);
                      newDate.setMinutes(minute);
                      onEndTimeChange(newDate);
                    }
                  }}
                  disabled={disablePastEndDates}
                  minTime={minEndTime}
                  initialFocus
                  className="rounded-md border-4 border-brand-muted w-auto"
                />
              </PopoverContent>
            </Popover>
            <div className="text-xs font-brand text-center">
              <div>{endTime ? format(endTime, "dd/MM") : "--/--"}</div>
              <div>{endTime ? format(endTime, "HH:mm") : "--:--"}</div>
            </div>
            <div className="text-xs text-brand-muted font-medium">End</div>
          </div>

          {/* Submission End Point */}
          <div
            className="absolute -top-16 transform -translate-x-1/2 flex flex-col items-center gap-2"
            style={{ left: `${submissionEnd}%` }}
          >
            <button
              className="w-10 h-10 rounded-full bg-brand border-2 border-neutral flex items-center justify-center cursor-grab active:cursor-grabbing hover:scale-110 transition-all"
              onMouseDown={(e) => {
                e.preventDefault();
                handleMouseDown("submission", e);
              }}
            >
              <span className="w-6">
                <LEADERBOARD />
              </span>
            </button>
            <div className="text-xs font-brand text-center">
              <div>{submissionEndDate ? format(submissionEndDate, "dd/MM") : "--/--"}</div>
              <div>{submissionEndDate ? format(submissionEndDate, "HH:mm") : "--:--"}</div>
            </div>
            <div className="text-xs text-brand-muted font-medium">Final</div>
          </div>
        </div>

        {/* Duration Labels Below Track */}
        <div className="absolute top-full mt-4 w-full flex">
          {registrationType === "fixed" && enableRegistration && registrationDuration > 0 && (
            <div
              className="text-center text-xs text-purple-400 font-medium"
              style={{ width: `${registrationEnd - registrationStart}%` }}
            >
              Registration: {formatDuration(registrationDuration)}
            </div>
          )}
          <div
            className="text-center text-xs text-brand-muted font-medium"
            style={{
              width: `${tournamentEnd - registrationEnd}%`,
              marginLeft: 0,
            }}
          >
            {registrationType === "open" ? "Tournament (Open Registration)" : "Tournament"}: {formatDuration(tournamentDuration)}
          </div>
          <div
            className="text-center text-xs text-blue-400 font-medium"
            style={{ width: `${submissionEnd - tournamentEnd}%` }}
          >
            Submission: {formatDuration(submissionPeriod)}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-4 justify-center text-xs">
          {registrationType === "fixed" && enableRegistration && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-purple-500/60" />
              <span className="text-neutral">Registration Period (Before Tournament)</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-brand-muted/80" />
            <span className="text-neutral">
              {registrationType === "open"
                ? "Tournament Duration (Registration During)"
                : "Tournament Duration"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500/60" />
            <span className="text-neutral">Submission Period</span>
          </div>
        </div>
        <div className="text-center text-xs text-neutral/60">
          {registrationType === "open"
            ? "Open: Users can register anytime during the tournament"
            : "Fixed: Registration period closes when tournament starts"}
        </div>
      </div>
    </div>
  );
};

export default ScheduleSlider;
