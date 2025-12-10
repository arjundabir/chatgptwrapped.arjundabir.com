import { motion } from 'motion/react';
import type { ToolsAndModelsData } from '@/lib/parseConversations';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Cell, LabelList } from 'recharts';
import { Badge } from '@/components/ui/badge';

interface ToolsAndModelsSlideProps {
  data: ToolsAndModelsData;
}

export function ToolsAndModelsSlide({ data }: ToolsAndModelsSlideProps) {
  // Prepare models chart data (horizontal bars)
  const modelsChartData = data.models.map((item) => ({
    name: item.name,
    count: item.count,
  }));

  const chartConfig = {
    count: {
      label: 'Usage',
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
          <div className="font-medium">{data.name}</div>
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 shrink-0 rounded-[2px] bg-[var(--color-count)]" />
            <span className="text-muted-foreground">Usage</span>
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
      {/* Tools Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full"
      >
        <h1 className="text-xl font-semibold mb-2">You put ChatGPT to work.</h1>
        {data.tools.length > 0 ? (
          <div className="flex flex-wrap gap-3 mt-4">
            {data.tools.map((tool) => (
              <Badge
                key={tool.name}
                variant="outline"
                className="px-4 py-2 text-sm font-medium"
              >
                <span>{tool.name}</span>
                <span className="ml-2 text-muted-foreground">{tool.count}</span>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground mt-2">No tools used.</p>
        )}
      </motion.div>

      {/* Models Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        className="w-full flex-1 flex flex-col"
      >
        <h2 className="text-xl font-semibold mb-4">Your go-to brain was...</h2>
        {data.models.length > 0 ? (
          <>
            <ChartContainer
              config={chartConfig}
              className="h-[300px] w-full flex-1"
            >
              <BarChart
                data={modelsChartData}
                layout="vertical"
                margin={{ left: 100, right: 20, top: 20, bottom: 20 }}
              >
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={60}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={90}
                  tick={{ fontSize: 12 }}
                />
                <ChartTooltip cursor={false} content={customTooltip} />
                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={true}
                  animationBegin={0}
                  animationDuration={800}
                  animationEasing="ease-out"
                >
                  {modelsChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="var(--color-count)" />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    className="fill-foreground text-sm font-medium"
                    formatter={(value: number) => value}
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
            {data.thinkingModeCount > 0 && (
              <p className="mt-4 text-base text-foreground">
                You triggered thinking mode{' '}
                <span className="text-2xl font-bold text-foreground">
                  {data.thinkingModeCount === 1
                    ? '1 time'
                    : `${data.thinkingModeCount.toLocaleString()} times`}
                </span>
                .
              </p>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">No model data available.</p>
        )}
      </motion.div>
    </div>
  );
}
