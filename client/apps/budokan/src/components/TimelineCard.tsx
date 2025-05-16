import { Card } from "@/components/ui/card";
import { ReactNode } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { formatTime } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TimelineCardProps {
  icon: ReactNode;
  date?: Date;
  duraton?: number;
  label?: string;
  showConnector?: boolean;
  color?: string;
  active?: boolean;
  completed?: boolean;
}

const TimelineCard = ({
  icon,
  date,
  duraton,
  label,
  showConnector = false,
  active = false,
  completed = false,
}: TimelineCardProps) => {
  return (
    <div className="relative flex flex-col gap-2">
      <Tooltip delayDuration={50}>
        <TooltipTrigger asChild>
          <Card
            variant={completed ? "default" : "outline"}
            className={`p-2 ${
              completed ? "text-black bg-brand-muted" : "text-brand-muted"
            } h-10 w-10 sm:h-14 sm:w-14 3xl:h-20 3xl:w-20 flex items-center justify-center z-20 cursor-pointer`}
          >
            {icon}
          </Card>
        </TooltipTrigger>
        {date && (
          <TooltipContent className="border-brand-muted bg-black text-brand 3xl:text-lg">
            <span className="text-brand-muted">
              {label === "Registration"
                ? "Registration Opened: "
                : label === "Duration"
                ? completed
                  ? "Tournament Started: "
                  : "Tournament Starts: "
                : label === "Submission"
                ? completed
                  ? "Tournament Ended: "
                  : "Tournament Ends: "
                : completed
                ? "Submission Ended: "
                : "Submission Ends: "}
            </span>
            {format(date, "dd/MM")} - {format(date, "HH:mm")}
          </TooltipContent>
        )}
      </Tooltip>
      {date && (
        <div className="flex flex-col items-center font-brand">
          <span className="text-xs">{format(date, "dd/MM")}</span>
          <span className="text-xs">{format(date, "HH:mm")}</span>
        </div>
      )}
      <div className={active ? "animate-pulse" : ""}>
        {label && (
          <span className="absolute -top-10 sm:-top-6 left-[calc(100%_-_0px)] w-[calc(100%_+_10px)] sm:w-[calc(100%_+_20px)] text-[10px] sm:text-[14px] 3xl:text-[16px] text-center font-brand whitespace-nowrap text-brand-muted">
            {label}
          </span>
        )}
        {duraton && (
          <span className="absolute -top-6 sm:top-0 left-[calc(100%_-_0px)] w-[calc(100%_+_10px)] sm:w-[calc(100%_+_20px)] text-[12px] sm:text-[14px] 3xl:text-[16px] text-center whitespace-nowrap">
            {duraton > 0 ? formatTime(duraton) : "Ended"}
          </span>
        )}
        {showConnector && (
          <motion.div
            className="absolute top-5 sm:top-7 3xl:top-9 left-[calc(100%_-_0px)] w-[calc(100%_+_10px)] sm:w-[calc(100%_+_20px)] h-0.5 border-t-4 border-dotted border-brand-muted z-10"
            initial={{ width: 0 }}
            animate={{ width: "calc(100% + var(--timeline-extension, 10px))" }}
            transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
          />
        )}
      </div>
    </div>
  );
};

export default TimelineCard;
