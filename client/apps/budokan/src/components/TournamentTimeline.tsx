import {
  START_FLAG,
  END_FLAG,
  LEADERBOARD,
  REGISTER,
} from "@/components/Icons";
import TimelineCard from "@/components/TimelineCard";

interface TournamentTimelineProps {
  type: string;
  createdTime: number;
  startTime: number;
  duration: number;
  submissionPeriod: number;
  pulse?: boolean;
}

const TournamentTimeline = ({
  type,
  createdTime,
  startTime,
  duration,
  submissionPeriod,
  pulse = false,
}: TournamentTimelineProps) => {
  const createdDate = new Date(createdTime * 1000);
  const startDate = new Date(startTime * 1000);
  const endDate = new Date((startTime + duration) * 1000);
  const submissionEndDate = new Date(
    (startTime + duration + submissionPeriod) * 1000
  );
  const registrationPeriod = startTime - createdTime;

  const isStarted =
    startTime < Number(BigInt(new Date().getTime()) / BigInt(1000));
  const isEnded =
    startTime + duration < Number(BigInt(new Date().getTime()) / BigInt(1000));
  const isSubmissionEnded =
    startTime + duration + submissionPeriod <
    Number(BigInt(new Date().getTime()) / BigInt(1000));

  return (
    <div className="flex flex-row items-center justify-center gap-10 sm:gap-20 3xl:gap-[100px] mt-4">
      {type === "fixed" && (
        <TimelineCard
          icon={
            <span className="w-6 sm:w-8 3xl:w-10">
              <REGISTER />
            </span>
          }
          date={createdDate}
          duraton={registrationPeriod}
          label="Registration"
          showConnector
          active={pulse ? !isStarted : false}
          completed={true}
        />
      )}
      <TimelineCard
        icon={
          <span className="w-4 sm:w-6 3xl:w-8">
            <START_FLAG />
          </span>
        }
        date={startDate}
        duraton={duration}
        label="Duration"
        showConnector
        active={pulse ? isStarted && !isEnded : false}
        completed={isStarted}
      />
      <TimelineCard
        icon={
          <span className="w-4 sm:w-6 3xl:w-8">
            <END_FLAG />
          </span>
        }
        date={endDate}
        duraton={submissionPeriod}
        label="Submission"
        showConnector
        active={pulse ? isEnded && !isSubmissionEnded : false}
        completed={isEnded}
      />
      <TimelineCard
        icon={
          <span className="w-6 sm:w-8 3xl:w-10">
            <LEADERBOARD />
          </span>
        }
        date={submissionEndDate}
        completed={isSubmissionEnded}
      />
    </div>
  );
};

export default TournamentTimeline;
