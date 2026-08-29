"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PhotoGalleryProps {
  photos: string[];
  businessName: string;
  categoryIcon?: string;
}

export function PhotoGallery({ photos, businessName, categoryIcon = "🏪" }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const hasPhotos = photos && photos.length > 0;
  const displayPhotos = hasPhotos ? photos : [];

  const handlePrevious = () => {
    setSelectedIndex((prev) => (prev === 0 ? displayPhotos.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === displayPhotos.length - 1 ? 0 : prev + 1));
  };

  const handleThumbnailClick = (index: number) => {
    setSelectedIndex(index);
    setIsLightboxOpen(true);
  };

  if (!hasPhotos) {
    return (
      <div className="relative flex h-64 items-center justify-center overflow-hidden rounded-lg border border-border bg-surface-1 md:h-80">
        <div className="font-mono text-display text-text-tertiary">{categoryIcon}</div>
      </div>
    );
  }

  return (
    <>
      {/* Main Photo Display */}
      <div className="group relative h-64 overflow-hidden rounded-lg border border-border md:h-80">
        <Image
          src={displayPhotos[0]}
          alt={businessName}
          fill
          className="cursor-pointer object-cover"
          onClick={() => setIsLightboxOpen(true)}
          priority
        />

        {/* Photo Count Badge */}
        {displayPhotos.length > 1 && (
          <div className="absolute bottom-4 right-4 rounded-md border border-white/15 bg-black/70 px-2 py-1 font-mono text-meta text-white">
            {displayPhotos.length} photos
          </div>
        )}

        {/* View All Button */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-4 left-4 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => setIsLightboxOpen(true)}
        >
          View photos
        </Button>
      </div>

      {/* Thumbnail Strip */}
      {displayPhotos.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {displayPhotos.slice(0, 4).map((photo, index) => (
            <button
              key={index}
              onClick={() => handleThumbnailClick(index)}
              className={cn(
                "relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-md border border-border transition-opacity",
                index === 0 ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
              )}
            >
              <Image
                src={photo}
                alt={`${businessName} photo ${index + 1}`}
                fill
                className="object-cover"
              />
              {index === 3 && displayPhotos.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-medium">
                  +{displayPhotos.length - 4}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox Dialog */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent
          className="max-w-5xl w-full h-[90vh] p-0 bg-black/95 border-none"
          // Lightbox images are self-describing — opt out of the Radix
          // aria-describedby warning.
          aria-describedby={undefined}
        >
          <VisuallyHidden>
            <DialogTitle>{businessName} photo gallery</DialogTitle>
          </VisuallyHidden>
          <div className="relative h-full flex flex-col">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            {/* Main Image */}
            <div className="flex-1 relative flex items-center justify-center">
              <Image
                src={displayPhotos[selectedIndex]}
                alt={`${businessName} photo ${selectedIndex + 1}`}
                fill
                className="object-contain"
              />

              {/* Navigation Arrows */}
              {displayPhotos.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-4 text-white hover:bg-white/20 h-12 w-12"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-4 text-white hover:bg-white/20 h-12 w-12"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}
            </div>

            {/* Thumbnail Strip */}
            {displayPhotos.length > 1 && (
              <div className="h-24 bg-black/50 flex items-center justify-center gap-2 px-4 overflow-x-auto">
                {displayPhotos.map((photo, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "relative h-16 w-16 flex-shrink-0 rounded overflow-hidden transition-all",
                      index === selectedIndex
                        ? "ring-2 ring-white"
                        : "opacity-50 hover:opacity-100"
                    )}
                  >
                    <Image
                      src={photo}
                      alt={`${businessName} photo ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Photo Counter */}
            <div className="absolute top-4 left-4 rounded-md border border-white/15 bg-black/70 px-2 py-1 font-mono text-meta text-white">
              {selectedIndex + 1} / {displayPhotos.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
