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
          className="w-full p-4 space-y-4 border border-brand-muted rounded-lg bg-background"
        >
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
          <Skeleton className="h-20 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
        </div>
      ))}
    </>
  );
};

export default TournamentSkeletons;
