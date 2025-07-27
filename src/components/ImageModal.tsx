import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImageModalProps {
  src: string;
  alt: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ImageModal({ src, alt, isOpen, onClose }: ImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-[90vw] h-[90vh] p-0 bg-background border-border">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="relative w-full h-full flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 z-10 bg-background/80 backdrop-blur-sm"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}