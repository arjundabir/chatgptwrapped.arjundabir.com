import { motion } from 'motion/react';
import type { GenerationsData } from '@/lib/parseConversations';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useEffect, useState } from 'react';

interface GenerationsGallerySlideProps {
  data: GenerationsData;
}

export function GenerationsGallerySlide({
  data,
}: GenerationsGallerySlideProps) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  // Create object URLs for images
  useEffect(() => {
    const urls = data.imageFiles.map((file) => URL.createObjectURL(file));
    setImageUrls(urls);

    // Cleanup function to revoke object URLs
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [data.imageFiles]);

  return (
    <div className="flex flex-col gap-8 max-w-2xl h-[calc(100dvh-(72px+32px))] py-6">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h1 className="text-xl font-semibold">Your Generations</h1>
      </motion.div>

      {/* Carousel Section */}
      {data.imageFiles.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          className="relative flex flex-col"
        >
          <Carousel
            className="w-full"
            opts={{
              align: 'start',
              slidesToScroll: 3,
            }}
          >
            <CarouselContent>
              {imageUrls.map((url, index) => (
                <CarouselItem key={index} className="basis-1/3">
                  <div className="relative w-full flex items-center justify-center py-4">
                    <img
                      src={url}
                      alt={`Generated image ${index + 1}`}
                      className="max-w-full max-h-[350px] w-auto h-auto object-contain rounded-lg"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {data.imageFiles.length > 3 && (
              <>
                <CarouselPrevious />
                <CarouselNext />
              </>
            )}
          </Carousel>

          {/* Caption at bottom right */}
          <p className="text-sm text-muted-foreground text-right mt-2">
            Your DALL-E generated images
          </p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          className="flex-1 flex items-center justify-center"
        >
          <p className="text-muted-foreground">No images generated.</p>
        </motion.div>
      )}

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
        className="flex flex-col gap-2"
      >
        <p className="text-3xl">
          <span className="text-muted-foreground">You generated </span>
          <span className="font-bold text-foreground text-4xl">
            {data.imageCount}
          </span>
          <span className="text-muted-foreground">
            {' '}
            {data.imageCount === 1 ? 'image and' : 'images and'}
          </span>{' '}
        </p>
        <p className="text-3xl">
          <span className="font-bold text-foreground text-4xl">
            {data.soraVideoCount}
          </span>
          <span className="text-muted-foreground">
            {' '}
            {data.soraVideoCount === 1 ? 'video' : 'videos'} with SORA
          </span>
        </p>
      </motion.div>
    </div>
  );
}
