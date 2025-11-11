import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AmountInputProps {
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  label?: string;
}

const AmountInput = ({ value, onChange, label }: AmountInputProps) => {
  const PREDEFINED_AMOUNTS = [
    { value: 0.25, label: "$0.25" },
    { value: 0.50, label: "$0.50" },
    { value: 1, label: "$1" },
    { value: 5, label: "$5" },
  ];
  return (
    <div className="flex flex-row items-center gap-2">
      {label && <Label>{label}</Label>}
      <div className="flex flex-row gap-2">
        {PREDEFINED_AMOUNTS.map(({ value: presetValue, label }) => (
          <Button
            key={presetValue}
            type="button"
            variant={value === presetValue ? "default" : "outline"}
            className="px-2"
            onClick={() => onChange(presetValue)}
          >
            {label}
          </Button>
        ))}
      </div>
      <Input
        type="number"
        placeholder="0.0"
        min={0}
        step="0.01"
        inputMode="decimal"
        className="w-[80px] p-1"
        value={value ?? ""}
        onChange={(e) => {
          const inputValue = e.target.value;
          onChange(inputValue === "" ? undefined : parseFloat(inputValue));
        }}
      />
    </div>
  );
};

export default AmountInput;
