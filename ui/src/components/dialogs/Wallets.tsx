import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConnect } from "@starknet-react/core";

interface WalletsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WalletsDialog = ({ open, onOpenChange }: WalletsDialogProps) => {
  const { connect, connectors } = useConnect();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wallets</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {connectors.map((connector) => (
            <div
              key={connector.id}
              onClick={() => connect({ connector })}
              className="flex flex-row items-center gap-5 h-16 border border-brand-muted rounded-md py-2 px-4 cursor-pointer hover:bg-brand/20 transition-colors"
            >
              <img
                src={
                  typeof connector.icon === "string"
                    ? connector.icon
                    : connector.icon?.dark
                }
                className="w-8 h-8"
              />

              <span className="text-brand">{connector.name}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WalletsDialog;
