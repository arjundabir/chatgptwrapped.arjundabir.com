import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import type { FinaleSlideData } from '@/lib/parseConversations';
import { Button } from '@/components/ui/button';
import { IconRefresh, IconShare } from '@tabler/icons-react';
import html2canvas from 'html2canvas';

interface FinaleSlideProps {
  data: FinaleSlideData;
}

export function FinaleSlide({ data }: FinaleSlideProps) {
  const [totalChats, setTotalChats] = useState(0);
  const [daysUsed, setDaysUsed] = useState(0);
  const [imageUrls, setImageUrls] = useState<
    Array<{ url: string; index: number }>
  >([]);
  const [isSharing, setIsSharing] = useState(false);
  const slideRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // Initialize three random images on mount
  useEffect(() => {
    if (data.imageFiles.length > 0) {
      const selectedIndices = new Set<number>();
      const urls: Array<{ url: string; index: number }> = [];

      // Select up to 3 unique random images
      while (selectedIndices.size < Math.min(3, data.imageFiles.length)) {
        const randomIndex = Math.floor(Math.random() * data.imageFiles.length);
        if (!selectedIndices.has(randomIndex)) {
          selectedIndices.add(randomIndex);
          const url = URL.createObjectURL(data.imageFiles[randomIndex]);
          urls.push({ url, index: randomIndex });
        }
      }

      setImageUrls(urls);
    }
  }, [data.imageFiles]);

  // Cleanup image URLs
  useEffect(() => {
    return () => {
      imageUrls.forEach(({ url }) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [imageUrls]);

  // Use Intersection Observer to trigger animation when section scrolls into view
  useEffect(() => {
    if (!statsRef.current || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            setTimeout(() => {
              setTotalChats(data.totalChats);
              setDaysUsed(data.daysUsed);
            }, 300);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(statsRef.current);

    return () => {
      observer.disconnect();
    };
  }, [data.totalChats, data.daysUsed]);

  // Function to change a specific image to a different random one
  const changeImage = (imageIndex: number) => {
    if (data.imageFiles.length === 0) return;

    const currentIndices = imageUrls.map((img) => img.index);
    const currentImageIndex = imageUrls[imageIndex].index;

    // Revoke old URL
    URL.revokeObjectURL(imageUrls[imageIndex].url);

    // Find a new random index that's different from current ones
    let newIndex;
    let attempts = 0;
    do {
      newIndex = Math.floor(Math.random() * data.imageFiles.length);
      attempts++;
      // If we only have one image total, just use it
      if (data.imageFiles.length === 1) break;
      // If we've tried many times and can't find unique, just use any different one
      if (attempts > 50) {
        if (newIndex !== currentImageIndex) break;
      }
    } while (currentIndices.includes(newIndex) && attempts < 50);

    // Update the specific image
    const newUrls = [...imageUrls];
    newUrls[imageIndex] = {
      url: URL.createObjectURL(data.imageFiles[newIndex]),
      index: newIndex,
    };
    setImageUrls(newUrls);
  };

  // Function to share/download the slide as an image
  const handleShare = async () => {
    if (!slideRef.current || isSharing) return;

    setIsSharing(true);
    try {
      const canvas = await html2canvas(slideRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'chatgpt-wrapped-2025.png';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
        setIsSharing(false);
      }, 'image/png');
    } catch (error) {
      console.error('Error generating share image:', error);
      setIsSharing(false);
    }
  };

  // Format personality type with proper article
  const formatPersonalityType = (type: string) => {
    if (type === 'early bird' || type === 'all-day chatter') {
      return `a${type === 'all-day chatter' ? 'n' : ''} ${type}`;
    }
    return `a ${type}`;
  };

  return (
    <div
      ref={slideRef}
      className="flex flex-col gap-8 max-w-2xl h-[calc(100dvh-(72px+32px))] py-6"
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h1 className="text-xl font-semibold">Your 2025</h1>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        ref={statsRef}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        className="flex flex-col gap-6"
      >
        {/* First stat: Total Chats */}
        <div>
          <NumberFlow
            value={totalChats}
            className="text-5xl font-bold text-foreground"
            formatOptions={{ useGrouping: true }}
          />
          <p className="text-base text-muted-foreground font-semibold mt-1">
            Chat sent this year
          </p>
        </div>

        {/* Second stat: Days Used */}
        <div>
          <NumberFlow
            value={daysUsed}
            className="text-5xl font-bold text-foreground"
            formatOptions={{ useGrouping: true }}
          />
          <p className="text-base text-muted-foreground font-semibold mt-1">
            Days used this year
          </p>
        </div>

        {/* Third stat: Personality Type */}
        <div>
          <p className="text-5xl font-bold text-foreground">
            {formatPersonalityType(data.personalityType)}
          </p>
        </div>
      </motion.div>

      {/* Three DALL-E Images Section */}
      {imageUrls.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          className="flex flex-col gap-4"
        >
          <div className="grid grid-cols-3 gap-4 flex-wrap">
            {imageUrls.map((imageData, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div className="relative">
                  <img
                    src={imageData.url}
                    alt={`Generated image ${index + 1}`}
                    className="object-cover rounded-lg"
                  />
                  {data.imageFiles.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => changeImage(index)}
                      className="absolute -top-2 -right-2 size-6 bg-background shadow-sm"
                    >
                      <IconRefresh className="size-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Bottom Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}
        className="mt-auto"
      >
        {/* Link */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground">
            chatgptwrapped.arjundabir.com
          </p>
        </div>

        {/* Share Button */}
        <Button
          type="button"
          onClick={handleShare}
          disabled={isSharing}
          className="w-full"
          size="lg"
        >
          <IconShare className="size-4" />
          {isSharing ? 'Generating...' : 'Share'}
        </Button>
      </motion.div>
    </div>
  );
}
