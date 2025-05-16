import { Skeleton } from "@/components/ui/skeleton";

interface TournamentSkeletonsProps {
  tournamentsCount: number;
  count?: number; // Optional count parameter to override tournamentsCount
}

const TournamentSkeletons = ({
  tournamentsCount,
  count,
}: TournamentSkeletonsProps) => {
  // Use count if provided, otherwise use tournamentsCount (up to 12 for pagination)
  // Also ensure we have a valid number (default to 3 if undefined or invalid)
  const skeletonCount =
    count ||
    (isFinite(tournamentsCount) && tournamentsCount > 0
      ? Math.min(tournamentsCount, 12)
      : 3);

  // Create an array of the appropriate length safely
  const skeletons = Array.from({ length: skeletonCount }, (_, i) => i);

  return (
    <>
      {skeletons.map((index) => (
        <div
          key={index}
          className="h-32 sm:h-48 animate-in fade-in zoom-in duration-300 ease-out border border-brand-muted rounded-lg bg-background p-4"
        >
          <div className="flex flex-col justify-between h-full">
            <div className="flex flex-col gap-2">
              <div className="flex flex-row items-center justify-between h-6">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <div className="hidden sm:block w-full h-0.5 bg-brand/25" />
              <div className="flex flex-row justify-between items-center sm:h-20">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </div>
            <div>
              <div className="flex flex-row justify-center items-center h-6 gap-5">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-[100px]" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
};

export default TournamentSkeletons;
