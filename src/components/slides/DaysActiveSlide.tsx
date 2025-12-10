import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import NumberFlow from '@number-flow/react';
import type { DaysActiveData } from '@/lib/parseConversations';
import {
  ContributionGraph,
  ContributionGraphCalendar,
  ContributionGraphBlock,
  ContributionGraphFooter,
  ContributionGraphLegend,
} from '@/components/kibo-ui/contribution-graph';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { format, isAfter, startOfToday } from 'date-fns';

interface DaysActiveSlideProps {
  data: DaysActiveData;
}

export function DaysActiveSlide({ data }: DaysActiveSlideProps) {
  // State for animated numbers - start at 0 and count up
  const [totalDays, setTotalDays] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [activeDaysInYear, setActiveDaysInYear] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

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
              setTotalDays(data.totalDays);
              setLongestStreak(data.longestStreak);
              setActiveDaysInYear(data.activeDaysInYear);
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
  }, [data.totalDays, data.longestStreak, data.activeDaysInYear]);

  // Function to trigger count-up animation (fallback for onAnimationComplete)
  const startCountUp = () => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      setTimeout(() => {
        setTotalDays(data.totalDays);
        setLongestStreak(data.longestStreak);
        setActiveDaysInYear(data.activeDaysInYear);
      }, 100);
    }
  };

  // Find the day with the most conversations
  const biggestDay = data.contributions.reduce(
    (max, current) => (current.count > max.count ? current : max),
    data.contributions[0] || { date: '', count: 0 }
  );

  // Format the biggest day date
  const biggestDayDate =
    biggestDay.count > 0
      ? (() => {
          const [year, month, day] = biggestDay.date.split('-').map(Number);
          return format(new Date(year, month - 1, day), 'MMMM d, yyyy');
        })()
      : null;

  return (
    <div className="flex flex-col gap-8 max-w-2xl h-[calc(100dvh-(72px+32px))] py-6">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h1 className="text-xl font-semibold">In 2025, you showed up.</h1>
      </motion.div>

      {/* Statistics */}
      <motion.div
        ref={statsRef}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        onAnimationComplete={startCountUp}
        className="w-full"
      >
        <div className="grid grid-cols-1 divide-y bg-border divide-border overflow-hidden rounded-lg md:grid-cols-3 md:divide-x md:divide-y-0">
          <Card className="rounded-none border-0 shadow-sm py-0 h-full">
            <CardContent className="p-4 sm:p-6 flex flex-col h-full">
              <CardTitle className="text-base font-normal min-h-12 flex items-start">
                Total days
              </CardTitle>
              <div className="mt-1 flex items-baseline">
                <NumberFlow
                  value={totalDays}
                  className="text-4xl font-bold text-primary"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-0 shadow-sm py-0 h-full">
            <CardContent className="p-4 sm:p-6 flex flex-col h-full">
              <CardTitle className="text-base font-normal min-h-12 flex items-start">
                Longest streak of consecutive days
              </CardTitle>
              <div className="mt-1 flex items-baseline">
                <NumberFlow
                  value={longestStreak}
                  className="text-4xl font-bold text-primary"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-none border-0 shadow-sm py-0 h-full">
            <CardContent className="p-4 sm:p-6 flex flex-col h-full">
              <CardTitle className="text-base font-normal min-h-12 flex items-start">
                Days you used ChatGPT in the year
              </CardTitle>
              <div className="mt-1 flex items-baseline">
                <NumberFlow
                  value={activeDaysInYear}
                  className="text-4xl font-bold text-primary"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      {/* Contribution Graph */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
        className="flex-1 overflow-auto"
      >
        <p className="mb-4 font-semibold">Conversation Chart</p>

        <TooltipProvider>
          <ContributionGraph
            data={data.contributions}
            className="w-full"
            maxLevel={4}
          >
            <ContributionGraphCalendar>
              {({ activity, dayIndex, weekIndex }) => {
                // Parse date as local time (YYYY-MM-DD format)
                const [year, month, day] = activity.date.split('-').map(Number);
                const activityDate = new Date(year, month - 1, day);
                const today = startOfToday();
                const isFutureDate = isAfter(activityDate, today);

                return (
                  <Tooltip key={`${weekIndex}-${dayIndex}`}>
                    <TooltipTrigger asChild>
                      <g>
                        <ContributionGraphBlock
                          activity={activity}
                          className="cursor-pointer"
                          dayIndex={dayIndex}
                          weekIndex={weekIndex}
                        />
                      </g>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-semibold">
                        {format(activityDate, 'MMMM d, yyyy')}
                      </p>
                      <p>
                        {activity.count === 0
                          ? isFutureDate
                            ? 'No Data Yet'
                            : 'No conversations'
                          : activity.count === 1
                          ? '1 conversation'
                          : `${activity.count} conversations`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              }}
            </ContributionGraphCalendar>
            <ContributionGraphFooter>
              <ContributionGraphLegend />
            </ContributionGraphFooter>
          </ContributionGraph>
        </TooltipProvider>

        {biggestDayDate && biggestDay.count > 0 && (
          <p className="mt-4 text-base text-muted-foreground">
            Your biggest day was{' '}
            <span className="text-2xl font-bold text-foreground">
              {biggestDayDate}
            </span>{' '}
            with{' '}
            <span className="text-2xl font-bold text-foreground">
              {biggestDay.count === 1
                ? '1 conversation'
                : `${biggestDay.count} conversations`}
            </span>
            .
          </p>
        )}
      </motion.div>
    </div>
  );
}
