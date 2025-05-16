import { formatGameSettings } from "@/lib/utils/formatting";

interface SmallSettingsTableProps {
  hasSettings: boolean;
  settings: any[];
}

const SmallSettingsTable = ({
  hasSettings,
  settings,
}: SmallSettingsTableProps) => {
  if (!hasSettings) {
    return (
      <div className="border border-brand-muted rounded-lg p-4">
        <div className="flex flex-col items-center justify-center text-center gap-2 text-muted-foreground">
          <div className="text-sm">No settings available for this game yet</div>
          <div className="text-xs">Default configuration will be used</div>
        </div>
      </div>
    );
  }

  const formattedSettings = formatGameSettings(settings);

  return (
    <div className="flex flex-row gap-2 overflow-x-auto pb-2">
      {formattedSettings.map((item, index) => (
        <div
          key={index}
          className="border border-brand-muted rounded-lg p-3 bg-background hover:bg-brand/10 transition-colors flex-shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-brand-muted">
                {item.formattedKey}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.formattedValue}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SmallSettingsTable;
