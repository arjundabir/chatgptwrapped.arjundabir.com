import { motion } from 'motion/react';
import type { TimeOfDayData } from '@/lib/parseConversations';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';

interface TimeOfDaySlideProps {
  data: TimeOfDayData;
}

export function TimeOfDaySlide({ data }: TimeOfDaySlideProps) {
  // Prepare hourly chart data
  const hourlyChartData = data.hourlyData.map((item) => ({
    hour: item.hour,
    label: item.label,
    count: item.count,
  }));

  // Find the hour with the most conversations
  const mostActiveHour = data.hourlyData.reduce((max, current) =>
    current.count > max.count ? current : max
  );

  const chartConfig = {
    value: {
      label: 'Conversations',
      color: 'hsl(var(--chart-1))',
    },
  };

  // Custom tooltip formatter
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="border-border/50 bg-background grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl">
          <div className="font-medium">{data.label}</div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-[var(--color-value)]" />
            <span className="text-muted-foreground">Conversations</span>
            <span className="ml-auto font-mono font-medium tabular-nums text-foreground">
              {data.count}
            </span>
          </div>
        </div>
      );
    }
    return null;
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
        <h1 className="text-xl font-semibold">Daily Trend</h1>
        <p className="text-4xl font-bold text-primary mt-2">
          You're a
          {data.personalityType === 'early bird' ||
          data.personalityType === 'all-day chatter'
            ? 'n'
            : ''}{' '}
          {data.personalityType}.
        </p>
      </motion.div>

      {/* Hourly Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        className="w-full"
      >
        <p className="mb-4 font-semibold">Conversations by Hour</p>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <BarChart data={hourlyChartData}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={-45}
              textAnchor="end"
              height={60}
              interval={0}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
            />
            <ChartTooltip cursor={false} content={customTooltip} />
            <Bar
              dataKey="count"
              fill="var(--color-value)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </BarChart>
        </ChartContainer>
      </motion.div>

      {/* Most Active Hour */}
      {mostActiveHour.count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
          className="w-full"
        >
          <p className="text-base text-foreground">
            You chat the most at{' '}
            <span className="text-2xl font-bold text-foreground">
              {mostActiveHour.label}
            </span>{' '}
            with{' '}
            <span className="text-2xl font-bold text-foreground">
              {mostActiveHour.count === 1
                ? '1 conversation'
                : `${mostActiveHour.count} conversations`}
            </span>
            .
          </p>
        </motion.div>
      )}
    </div>
  );
}
