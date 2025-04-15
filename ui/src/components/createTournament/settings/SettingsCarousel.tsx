import React from "react";
import { cn, feltToString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WEDGE_LEFT, WEDGE_RIGHT } from "@/components/Icons";
import SettingsTable from "@/components/createTournament/settings/SettingsTable";
import TokenGameIcon from "@/components/icons/TokenGameIcon";
import useUIStore from "@/hooks/useUIStore";

interface SettingsCarouselProps {
  game: string;
  settings: any[];
  value: string;
  onChange: (value: string) => void;
  setOpen: (value: boolean) => void;
}

const SettingsCarousel = ({
  game,
  settings,
  value,
  onChange,
  setOpen,
}: SettingsCarouselProps) => {
  const { getGameImage } = useUIStore();
  const [currentIndex, setCurrentIndex] = React.useState(() => {
    if (!Object.values(settings)?.length) return 0;
    return Math.max(
      0,
      Object.values(settings).findIndex((s) => s.id === value)
    );
  });

  // If no settings available, show fallback UI
  if (!Object.values(settings)?.length) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
          <TokenGameIcon size="lg" image={getGameImage(game)} />
          <div className="text-sm">No settings available for this game yet</div>
          <div className="text-xs">Default configuration will be used</div>
        </div>
      </div>
    );
  }

  const currentSetting = settings[currentIndex];

  return (
    <div className="space-y-4">
      <div className="relative px-6 min-h-[200px] max-h-[600px]">
        <div className="flex flex-col gap-2 items-center w-full">
          <TokenGameIcon size="lg" image={getGameImage(game)} />
          <div className="flex flex-col items-center">
            <h3 className="text-2xl font-brand">
              {feltToString(currentSetting.name)}
            </h3>
            <p className="text-brand-muted">{currentSetting.description}</p>
          </div>

          {/* Add the settings table */}
          <SettingsTable
            hasSettings={currentSetting.hasSettings}
            settings={currentSetting.settings}
          />
        </div>

        <div className="absolute -inset-x-4 top-1/2 flex justify-between -translate-y-1/2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="h-8 w-8 rounded-full"
          >
            <WEDGE_LEFT />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              setCurrentIndex((i) =>
                Math.min(Object.values(settings).length - 1, i + 1)
              )
            }
            disabled={currentIndex === Object.values(settings).length - 1}
            className="h-8 w-8 rounded-full"
          >
            <WEDGE_RIGHT />
          </Button>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-1">
          {Object.values(settings).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full",
                i === currentIndex ? "bg-brand" : "bg-muted"
              )}
            />
          ))}
        </div>
        {game ===
          "0x0444834e7b71749832f0db8c64f17ed1c3af8462c1682c10dcd6068b1c57494b" && (
          <div className="flex flex-row gap-2">
            <span className="text-brand-muted">More info at</span>
            <a
              href={`https://darkshuffle.io/settings/${currentIndex}`}
              target="_blank"
              className="text-brand underline"
            >
              Dark Shuffle
            </a>
          </div>
        )}
        <Button
          onClick={() => {
            onChange(currentSetting.settings_id.toString());
            setOpen(false);
          }}
          disabled={currentIndex === Number(value)}
        >
          {currentIndex === Number(value) ? "Selected" : "Select"}
        </Button>
      </div>
    </div>
  );
};

export default SettingsCarousel;
