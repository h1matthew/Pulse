"use client";

import { useState } from "react";
import Image from "next/image";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
      <div className="h-64 md:h-80 bg-gradient-to-br from-primary/10 via-chart-2/10 to-chart-3/10 rounded-2xl flex items-center justify-center relative overflow-hidden">
        <div className="text-8xl">{categoryIcon}</div>
      </div>
    );
  }

  return (
    <>
      {/* Main Photo Display */}
      <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden group">
        <Image
          src={displayPhotos[0]}
          alt={businessName}
          fill
          className="object-cover cursor-pointer transition-transform duration-300 group-hover:scale-105"
          onClick={() => setIsLightboxOpen(true)}
          priority
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* Photo Count Badge */}
        {displayPhotos.length > 1 && (
          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
            {displayPhotos.length} photos
          </div>
        )}

        {/* View All Button */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsLightboxOpen(true)}
        >
          View Photos
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
                "relative h-20 w-20 flex-shrink-0 rounded-lg overflow-hidden transition-all",
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
        <DialogContent className="max-w-5xl w-full h-[90vh] p-0 bg-black/95 border-none">
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
            <div className="absolute top-4 left-4 text-white bg-black/50 px-3 py-1 rounded-full text-sm">
              {selectedIndex + 1} / {displayPhotos.length}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
