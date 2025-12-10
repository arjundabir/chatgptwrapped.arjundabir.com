import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import type { FirstConversationData } from '@/lib/parseConversations';
import Ai01 from '../ai-01';

interface FirstConversationSlideProps {
  data: FirstConversationData;
}

export function FirstConversationSlide({ data }: FirstConversationSlideProps) {
  const formattedDate = data.date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col gap-8 max-w-2xl h-[calc(100dvh-(72px+32px))] py-6">
      <h1 className="text-xl font-semibold">Your First Chat in 2025:</h1>
      {/* Date on top */}
      <div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <p className="text-base text-muted-foreground font-semibold">
            {formattedDate}
          </p>
        </motion.div>

        {/* Large title heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
        >
          <h2 className="text-4xl font-bold text-foreground leading-tight">
            {data.title}
          </h2>
        </motion.div>

        {/* See conversation link */}
        {data.conversationId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.4 }}
          >
            <a
              href={`https://chatgpt.com/c/${data.conversationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              See conversation
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </motion.div>
        )}
      </div>

      {/* User message - slides in from bottom right */}
      {data.firstUserMessage && (
        <motion.div
          initial={{ opacity: 0, x: 50, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.6 }}
          className="flex justify-end"
        >
          <div className="bg-muted rounded-2xl px-4 py-3 max-w-[80%]">
            <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{data.firstUserMessage}</ReactMarkdown>
            </div>
          </div>
        </motion.div>
      )}

      {/* Assistant message - slides in from bottom left */}
      {data.firstAssistantMessage && (
        <motion.div
          initial={{ opacity: 0, x: -50, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut', delay: 0.8 }}
          className="flex justify-start"
        >
          <div className="rounded-2xl px-4 py-3 max-w-[80%]">
            <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>
                {data.firstAssistantMessage.length > 400
                  ? data.firstAssistantMessage.slice(0, 400) + '...'
                  : data.firstAssistantMessage}
              </ReactMarkdown>
            </div>
          </div>
        </motion.div>
      )}
      <Ai01 />

      {/* Let's see what you did in 2025... */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 1.0 }}
      >
        <p className="text-base text-foreground">
          Let's see what you did in 2025.{' '}
          <span className="italic"> Click the arrow to continue.</span>
        </p>
      </motion.div>
    </div>
  );
}
