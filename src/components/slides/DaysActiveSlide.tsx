import { motion } from 'motion/react';
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
import { format, isAfter, startOfToday } from 'date-fns';

interface DaysActiveSlideProps {
  data: DaysActiveData;
}

export function DaysActiveSlide({ data }: DaysActiveSlideProps) {
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
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <h1 className="text-xl font-semibold">In 2025, you showed up.</h1>
      </motion.div>

      {/* Statistics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <p className="text-4xl font-bold text-foreground leading-tight">
            {data.totalDays}
          </p>
          <p className="text-base text-muted-foreground">Total days</p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-4xl font-bold text-foreground leading-tight">
            {data.longestStreak}
          </p>
          <p className="text-base text-muted-foreground">
            Longest streak of consecutive days
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-4xl font-bold text-foreground leading-tight">
            {data.activeDaysInYear}
          </p>
          <p className="text-base text-muted-foreground">
            Days you used ChatGPT in the year
          </p>
        </div>
      </motion.div>

      {/* Contribution Graph */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
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
