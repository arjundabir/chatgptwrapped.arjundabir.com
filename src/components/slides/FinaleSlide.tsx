import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import type { FinaleSlideData } from '@/lib/parseConversations';
import { Button } from '@/components/ui/button';
import { IconRefresh, IconShare } from '@tabler/icons-react';
import html2canvas from 'html2canvas-pro';

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
    if (isSharing) return;

    setIsSharing(true);
    let tempContainer: HTMLDivElement | null = null;

    try {
      const targetWidth = 1080;
      const targetHeight = 1920;

      // Convert images to base64 data URLs
      const imageDataUrls: string[] = [];
      for (const imageData of imageUrls.slice(0, 3)) {
        try {
          const file = data.imageFiles[imageData.index];
          const dataUrl = await fileToDataURL(file);
          imageDataUrls.push(dataUrl);
        } catch (error) {
          console.error('Error converting image to base64:', error);
          // Continue with other images even if one fails
        }
      }

      // Generate HTML structure
      const htmlContent = await generateShareImageHTML(
        data.totalChats,
        data.daysUsed,
        data.personalityType,
        imageDataUrls
      );

      // Create temporary container element
      tempContainer = document.createElement('div');
      tempContainer.style.position = 'fixed';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '0';
      tempContainer.style.width = `${targetWidth}px`;
      tempContainer.style.height = `${targetHeight}px`;
      tempContainer.innerHTML = htmlContent;
      document.body.appendChild(tempContainer);

      // Wait for images to load
      const images = tempContainer.querySelectorAll('img');
      await Promise.allSettled(
        Array.from(images).map(
          (img) =>
            new Promise<void>((resolve) => {
              if (img.complete) {
                resolve();
              } else {
                img.onload = () => resolve();
                img.onerror = () => {
                  console.warn('Image failed to load, continuing anyway');
                  resolve(); // Resolve instead of reject to continue
                };
              }
            })
        )
      );

      // Wait a bit more for layout to settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Convert to canvas
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: '#ffffff',
        width: targetWidth,
        height: targetHeight,
        scale: 1,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      // Ensure canvas is exactly 1080x1920
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = targetWidth;
      finalCanvas.height = targetHeight;
      const ctx = finalCanvas.getContext('2d');

      if (ctx) {
        // Draw the captured canvas, scaling if needed to fit exact dimensions
        ctx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
      }

      // Download the image
      finalCanvas.toBlob((blob) => {
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
    } finally {
      // Clean up temporary container
      if (tempContainer && tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
    }
  };

  // Format personality type with proper article
  const formatPersonalityType = (type: string) => {
    if (type === 'early bird' || type === 'all-day chatter') {
      return `a${type === 'all-day chatter' ? 'n' : ''} ${type}`;
    }
    return `a ${type}`;
  };

  // Convert File to base64 data URL
  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Generate optimized HTML structure for image export
  const generateShareImageHTML = async (
    totalChats: number,
    daysUsed: number,
    personalityType: string,
    imageDataUrls: string[]
  ): Promise<string> => {
    const formattedPersonality = formatPersonalityType(personalityType);

    // Format numbers with commas
    const formatNumber = (num: number) => {
      return num.toLocaleString('en-US');
    };

    // Helper to create text with preserved spaces
    const spacedText = (text: string) => {
      return text.split(' ').join('\u00A0'); // Use non-breaking spaces
    };
    const hackySpacedText = (text: string) => {
      return text.split(' ').join(' '); // Use non-breaking spaces
    };

    // Generate image HTML (up to 3 images)
    const imageHTML = imageDataUrls
      .slice(0, 3)
      .map(
        (dataUrl) => `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 0;">
        <img 
          src="${dataUrl}" 
          alt="Generated image" 
          style="width: 100%; height: auto; max-height: 100%; object-fit: contain; border-radius: 12px; display: block;"
        />
      </div>
    `
      )
      .join('');

    return `
      <div style="
        width: 1080px;
        height: 1920px;
        background-color: #ffffff;
        color: #000000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
        display: flex;
        flex-direction: column;
        padding: 96px 72px;
        box-sizing: border-box;
      ">
        <!-- Title -->
        <h1 style="
          font-size: 56px;
          font-weight: 600;
          margin: 0 0 96px 0;
          color: #000000;
          line-height: 1.2;
          letter-spacing: -0.02em;
        ">ChatGPT 2025 Wrapped</h1>

        <!-- Stats Section -->
        <div style="
          display: flex;
          flex-direction: column;
          gap: 64px;
          margin-bottom: 96px;
        ">
          <!-- Total Chats -->
          <div>
            <div style="
              font-size: 140px;
              font-weight: 700;
              line-height: 1;
              color: #000000;
              margin-bottom: 12px;
              letter-spacing: -0.03em;
            ">${formatNumber(totalChats)}</div>
            <p style="
              font-size: 28px;
              font-weight: 600;
              color: #666666;
              margin: 0;
              line-height: 1.4;
              width: 1080px;
            ">${hackySpacedText('Chats created')}</p>
          </div>

          <!-- Days Used -->
          <div>
            <div style="
              font-size: 140px;
              font-weight: 700;
              line-height: 1;
              color: #000000;
              margin-bottom: 12px;
              letter-spacing: -0.03em;
            ">${formatNumber(daysUsed)}</div>
            <p style="
              font-size: 28px;
              font-weight: 600;
              color: #666666;
              margin: 0;
              line-height: 1.4;
              width 1080px;
            ">${hackySpacedText('Days used this year')}</p>
          </div>

          <!-- Personality Type -->
          <div>
            <p style="
              font-size: 80px;
              font-weight: 700;
              color: #000000;
              margin: 0;
              line-height: 1.2;
              letter-spacing: -0.02em;
            ">${spacedText(formattedPersonality)}</p>
          </div>
        </div>

        <!-- Images Section -->
        ${
          imageDataUrls.length > 0
            ? `
        <div style="
          display: flex;
          gap: 20px;
          margin-bottom: auto;
          flex: 1;
          align-items: flex-start;
          min-height: 0;
        ">
          ${imageHTML}
        </div>
        `
            : ''
        }

        <!-- Footer Link -->
        <div style="
          margin-top: auto;
          padding-top: 48px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        ">
          <p style="
            font-size: 20px;
            color: #999999;
            margin: 0;
            font-weight: 400;
            letter-spacing: 0.01em;
          ">chatgptwrapped.arjundabir.com</p>
          <p style="
            font-size: 20px;
            color: #999999;
            margin: 0;
            font-weight: 400;
            letter-spacing: 0.01em;
            text-align: right;
          ">Unofficial — Not endorsed by OpenAI</p>
        </div>
      </div>
    `;
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
        <h1 className="text-xl font-semibold">2025 ChatGPT Wrapped</h1>
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
          <p className="text-xs text-muted-foreground text-right">
            Generated Images
          </p>
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
        <div className="mb-4 flex justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            chatgptwrapped.arjundabir.com
          </p>
          <p className="text-xs text-muted-foreground text-right">
            Unofficial — Not endorsed by OpenAI
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
