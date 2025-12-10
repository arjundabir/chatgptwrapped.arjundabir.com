import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import type { ChatsAndMessagesData } from '@/lib/parseConversations';
import { Badge } from '@/components/ui/badge';

interface ChatsAndMessagesSlideProps {
  data: ChatsAndMessagesData;
}

export function ChatsAndMessagesSlide({ data }: ChatsAndMessagesSlideProps) {
  // State for animated numbers - start at 0 and count up
  const [totalChats, setTotalChats] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  // State for word cloud animation
  const [shouldAnimateWords, setShouldAnimateWords] = useState(false);
  const wordCloudRef = useRef<HTMLDivElement>(null);
  const hasAnimatedWords = useRef(false);

  // Use Intersection Observer to trigger animation when section scrolls into view
  useEffect(() => {
    if (!statsRef.current || hasAnimated.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            // Small delay to ensure NumberFlow is mounted and ready
            setTimeout(() => {
              setTotalChats(data.totalChats);
              setTotalMessages(data.totalMessages);
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
  }, [data.totalChats, data.totalMessages]);

  // Function to trigger count-up animation (fallback for onAnimationComplete)
  const startCountUp = () => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      setTimeout(() => {
        setTotalChats(data.totalChats);
        setTotalMessages(data.totalMessages);
      }, 100);
    }
  };

  // Use Intersection Observer to trigger word cloud animation when section scrolls into view
  useEffect(() => {
    if (!wordCloudRef.current || hasAnimatedWords.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimatedWords.current) {
            hasAnimatedWords.current = true;
            // Trigger animation for all words
            setShouldAnimateWords(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(wordCloudRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Limit to top 100 words to avoid clutter
  const topWords = data.wordFrequencies.slice(0, 100);

  // Calculate min and max frequency for scaling
  const maxFrequency = topWords.length > 0 ? topWords[0].count : 1;
  const minFrequency =
    topWords.length > 0 ? topWords[topWords.length - 1].count : 1;

  // Helper function to calculate badge size based on frequency
  const getBadgeSize = (frequency: number) => {
    if (maxFrequency === minFrequency) {
      // All words have the same frequency
      return {
        fontSize: '0.875rem',
        padding: '0.5rem 0.75rem',
      };
    }

    // Normalize frequency to 0-1 range
    const normalized =
      (frequency - minFrequency) / (maxFrequency - minFrequency);

    // Map to size range: fontSize from 0.75rem to 1.5rem, padding from 0.5rem to 1rem
    const fontSize = `${0.75 + normalized * 0.75}rem`;
    const paddingVertical = `${0.5 + normalized * 0.5}rem`;
    const paddingHorizontal = `${0.75 + normalized * 0.75}rem`;

    return {
      fontSize,
      padding: `${paddingVertical} ${paddingHorizontal}`,
    };
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl h-[calc(100dvh-(72px+32px))] py-6">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h1 className="text-xl font-semibold">Chats & Messages</h1>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        ref={statsRef}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
        onAnimationComplete={startCountUp}
        className="flex flex-col gap-6"
      >
        {/* Total Chats */}
        <div>
          <p className="text-base text-muted-foreground mb-1">Total chats</p>
          <NumberFlow
            value={totalChats}
            className="text-6xl font-bold text-foreground"
            formatOptions={{ useGrouping: true }}
          />
        </div>

        {/* Total Messages */}
        <div>
          <p className="text-base text-muted-foreground mb-1">
            Total messages sent
          </p>
          <NumberFlow
            value={totalMessages}
            className="text-6xl font-bold text-foreground"
            formatOptions={{ useGrouping: true }}
          />
        </div>
      </motion.div>

      {/* Word Cloud Section */}
      {topWords.length > 0 && (
        <motion.div
          ref={wordCloudRef}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
          className="flex-1 overflow-auto"
        >
          <h2 className="text-xl font-semibold mb-4">Your year in words.</h2>
          <div className="flex flex-wrap gap-2">
            {topWords.map((wordData, index) => {
              const size = getBadgeSize(wordData.count);
              return (
                <motion.div
                  key={wordData.word}
                  initial={{ opacity: 0, y: -10 }}
                  animate={
                    shouldAnimateWords
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: -10 }
                  }
                  transition={{
                    duration: 0.4,
                    ease: 'easeOut',
                    delay: index * 0.02, // Stagger delay: each word appears 20ms after the previous
                  }}
                >
                  <Badge
                    variant="outline"
                    className="transition-all"
                    style={{
                      fontSize: size.fontSize,
                      padding: size.padding,
                    }}
                  >
                    {wordData.word}
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
