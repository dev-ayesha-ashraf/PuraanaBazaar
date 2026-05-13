import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface OrderConfirmationDialogProps {
  isOpen: boolean;
  productTitle: string;
  productPrice: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function OrderConfirmationDialog({
  isOpen,
  productTitle,
  productPrice,
  onConfirm,
  onCancel,
}: OrderConfirmationDialogProps) {
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setTimeLeft(5);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-card border border-border rounded-3xl p-6 md:p-8 shadow-elegant animate-in zoom-in duration-300">
        <div className="flex items-start gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <AlertCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="font-serif text-xl text-primary">Review Your Order</h2>
            <p className="text-xs text-muted-foreground mt-1">Please verify details before confirming</p>
          </div>
        </div>

        <div className="bg-secondary/50 rounded-2xl p-4 mb-6 space-y-3">
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">Item:</span>
            <span className="text-sm font-medium text-right line-clamp-2 max-w-xs">{productTitle}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-border/30">
            <span className="text-sm text-muted-foreground">Amount:</span>
            <span className="text-lg font-semibold text-primary">{productPrice}</span>
          </div>
        </div>

        <div className="mb-6 space-y-2">
          <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000 animate-pulse"
              style={{ width: `${(timeLeft / 5) * 100}%` }}
            />
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Auto-cancel in{" "}
              <span className="font-semibold text-primary">
                {timeLeft}s
              </span>
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={onCancel}
          >
            Modify Details
          </Button>
          <Button
            variant="hero"
            size="lg"
            className="flex-1"
            onClick={onConfirm}
          >
            Confirm Order
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Once confirmed, seller must approve before delivery starts.
        </p>
      </div>
    </div>
  );
}
