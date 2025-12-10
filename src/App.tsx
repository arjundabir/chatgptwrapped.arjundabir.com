import { Textarea } from '@/components/ui/textarea';

import type React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  IconSend,
  IconMicrophone,
  IconPlus,
  IconArrowUp,
  IconArrowDown,
  IconFolder,
} from '@tabler/icons-react';
import { useRef, useState, useEffect } from 'react';
import {
  parseFirstConversationFromFiles,
  parseDaysActiveFromFiles,
  parseTimeOfDayFromFiles,
  parseToolsAndModelsFromFiles,
  parseGenerationsFromFiles,
  parseChatsAndMessagesFromFiles,
  parseFinaleSlideData,
  type FirstConversationData,
  type DaysActiveData,
  type TimeOfDayData,
  type ToolsAndModelsData,
  type GenerationsData,
  type ChatsAndMessagesData,
  type FinaleSlideData,
} from '@/lib/parseConversations';
import { FirstConversationSlide } from '@/components/slides/FirstConversationSlide';
import { DaysActiveSlide } from '@/components/slides/DaysActiveSlide';
import { TimeOfDaySlide } from '@/components/slides/TimeOfDaySlide';
import { ToolsAndModelsSlide } from '@/components/slides/ToolsAndModelsSlide';
import { GenerationsGallerySlide } from '@/components/slides/GenerationsGallerySlide';
import { ChatsAndMessagesSlide } from '@/components/slides/ChatsAndMessagesSlide';
import { FinaleSlide } from '@/components/slides/FinaleSlide';
import { motion } from 'motion/react';
import LogoAnimation from '@/components/logo-animation';
import { extractZipToFileList, isZipFile } from '@/lib/extractZip';

export default function Ai01() {
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [submittedFolderName, setSubmittedFolderName] = useState<string | null>(
    null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isWrappedMode, setIsWrappedMode] = useState(false);
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [wrappedData, setWrappedData] = useState<FirstConversationData | null>(
    null
  );
  const [daysActiveData, setDaysActiveData] = useState<DaysActiveData | null>(
    null
  );
  const [timeOfDayData, setTimeOfDayData] = useState<TimeOfDayData | null>(
    null
  );
  const [toolsAndModelsData, setToolsAndModelsData] =
    useState<ToolsAndModelsData | null>(null);
  const [generationsData, setGenerationsData] =
    useState<GenerationsData | null>(null);
  const [chatsAndMessagesData, setChatsAndMessagesData] =
    useState<ChatsAndMessagesData | null>(null);
  const [finaleSlideData, setFinaleSlideData] =
    useState<FinaleSlideData | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<FileList | null>(null);
  const [showChatMessages, setShowChatMessages] = useState(false);
  const [showProcessing, setShowProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtractingZip, setIsExtractingZip] = useState(false);
  const [pendingZipFileName, setPendingZipFileName] = useState<string | null>(
    null
  );
  const [hasReachedFirstSlide, setHasReachedFirstSlide] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounterRef.current = 0;

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        // Check if a zip file was dropped
        const zipFile = Array.from(files).find((file) => isZipFile(file));

        if (zipFile) {
          try {
            // Show loading state in input area
            setIsExtractingZip(true);
            setPendingZipFileName(zipFile.name);
            const folderName = zipFile.name.replace(/\.zip$/i, '');
            setSelectedFolder(folderName);

            const extractedFiles = await extractZipToFileList(zipFile);
            setUploadedFiles(extractedFiles);
            setIsExtractingZip(false);
            setPendingZipFileName(null);
          } catch (error) {
            console.error('Error extracting zip:', error);
            setIsExtractingZip(false);
            setPendingZipFileName(null);
            setSelectedFolder(null);
            // Could show an error message to user here
          }
        } else {
          // Regular folder drop
          setUploadedFiles(files);
          setSelectedFolder('ChatGPT Data');
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Scroll to bottom when chat messages or processing appears
  useEffect(() => {
    if (showChatMessages || showProcessing) {
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({
            top: scrollContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 100);
    }
  }, [showChatMessages, showProcessing]);

  // Calculate max slide based on available data
  const getMaxSlide = () => {
    let maxSlide = -1;
    if (wrappedData) maxSlide = 0; // Slide 0: First Conversation
    if (daysActiveData) maxSlide = 1; // Slide 1: Days Active
    if (timeOfDayData) maxSlide = 2; // Slide 2: Time of Day
    if (toolsAndModelsData) maxSlide = 3; // Slide 3: Tools and Models
    if (generationsData) maxSlide = 4; // Slide 4: Generations Gallery
    if (chatsAndMessagesData) maxSlide = 5; // Slide 5: Chats & Messages
    if (finaleSlideData) maxSlide = 6; // Slide 6: Finale
    // Add more slides here as they're implemented
    return maxSlide;
  };

  // Scroll to current slide when it changes
  useEffect(() => {
    if (isWrappedMode && currentSlide >= 0) {
      const slideElement = slideRefs.current[currentSlide];
      if (slideElement) {
        // Wait for the slide to render, then scroll smoothly
        setTimeout(() => {
          slideElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 100);
      }
    }
  }, [currentSlide, isWrappedMode]);

  // Enable scroll snap when second slide comes into view
  useEffect(() => {
    if (!isWrappedMode || !daysActiveData || hasReachedFirstSlide) return;

    const secondSlideElement = slideRefs.current[1];
    if (!secondSlideElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Second slide is in view, enable scroll snap
            setHasReachedFirstSlide(true);
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-20% 0px -20% 0px', // Trigger when slide is well into view
      }
    );

    observer.observe(secondSlideElement);

    return () => {
      observer.disconnect();
    };
  }, [isWrappedMode, daysActiveData, hasReachedFirstSlide]);

  // Track current slide via IntersectionObserver (only increases, never decreases)
  useEffect(() => {
    if (!isWrappedMode) return;

    // Check if we have any slides to observe
    const hasSlides = slideRefs.current.some((ref) => ref !== null);
    if (!hasSlides) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            // Find which slide index this element corresponds to
            const slideIndex = slideRefs.current.findIndex(
              (ref) => ref === entry.target
            );
            if (slideIndex !== -1) {
              // Only update if this slide is further than the current position
              setCurrentSlide((prev) => Math.max(prev, slideIndex));
            }
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: '-10% 0px -10% 0px',
      }
    );

    // Observe all available slides
    slideRefs.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [
    isWrappedMode,
    wrappedData,
    daysActiveData,
    timeOfDayData,
    toolsAndModelsData,
    generationsData,
    chatsAndMessagesData,
    finaleSlideData,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (message.trim()) {
      setMessage('');
      setIsExpanded(false);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }

    if (selectedFolder && uploadedFiles && !isWrappedMode) {
      setIsSubmitting(true);

      // Store folder name for chat message display
      setSubmittedFolderName(selectedFolder);

      // Clear folder from input field UI (but keep uploadedFiles for processing)
      setSelectedFolder(null);

      // Show user message with folder
      setShowChatMessages(true);

      // After a short delay, show processing message
      setTimeout(() => {
        setShowProcessing(true);
      }, 500);

      // Parse conversations
      const firstConv = await parseFirstConversationFromFiles(uploadedFiles);
      const daysActive = await parseDaysActiveFromFiles(uploadedFiles);
      const timeOfDay = await parseTimeOfDayFromFiles(uploadedFiles);
      const toolsAndModels = await parseToolsAndModelsFromFiles(uploadedFiles);
      const generations = await parseGenerationsFromFiles(uploadedFiles);
      const chatsAndMessages = await parseChatsAndMessagesFromFiles(
        uploadedFiles
      );

      if (firstConv) {
        setWrappedData(firstConv);
        if (daysActive) {
          setDaysActiveData(daysActive);
        }
        if (timeOfDay) {
          setTimeOfDayData(timeOfDay);
        }
        if (toolsAndModels) {
          setToolsAndModelsData(toolsAndModels);
        }
        if (generations) {
          setGenerationsData(generations);
        }
        if (chatsAndMessages) {
          setChatsAndMessagesData(chatsAndMessages);
        }

        // Parse finale slide data (combines data from other slides)
        const finaleData = parseFinaleSlideData(
          chatsAndMessages,
          daysActive,
          timeOfDay,
          generations
        );
        if (finaleData) {
          setFinaleSlideData(finaleData);
        }

        // Show wrapped mode after processing
        setTimeout(() => {
          setIsWrappedMode(true);
          setCurrentSlide(0); // Start at first slide
          setHasReachedFirstSlide(false); // Reset scroll snap state
          setIsSubmitting(false);
        }, 1500);
      }
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }

    setIsExpanded(e.target.value.length > 100 || e.target.value.includes('\n'));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      // Get the folder name from the first file's path
      const path = files[0].webkitRelativePath;
      const folderName = path.split('/')[0];
      setSelectedFolder(folderName);
      setUploadedFiles(files);
    }
  };

  const handleZipSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const zipFile = files[0];
      if (isZipFile(zipFile)) {
        try {
          // Show loading state in input area
          setIsExtractingZip(true);
          setPendingZipFileName(zipFile.name);
          const folderName = zipFile.name.replace(/\.zip$/i, '');
          setSelectedFolder(folderName);

          const extractedFiles = await extractZipToFileList(zipFile);
          setUploadedFiles(extractedFiles);
          setIsExtractingZip(false);
          setPendingZipFileName(null);
        } catch (error) {
          console.error('Error extracting zip:', error);
          setIsExtractingZip(false);
          setPendingZipFileName(null);
          setSelectedFolder(null);
          // Could show an error message to user here
        }
      }
    }
  };

  const handleInputClick = () => {
    // Open zip file input by default (users can also drag folders)
    zipInputRef.current?.click();
  };

  return (
    <div className="w-full h-screen flex flex-col relative overflow-hidden bg-background">
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <IconFolder className="size-16 text-[#3B82F6]" />
            <p className="text-xl font-medium text-foreground">
              Upload your ChatGPT folder or zip file
            </p>
          </div>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={cn(
          'flex-1 overflow-auto px-4 pb-4 relative',
          hasReachedFirstSlide && 'snap-y snap-proximity'
        )}
      >
        <div className="max-w-3xl w-full mx-auto pt-16">
          {/* Instructions - always visible */}
          <>
            <h1 className="text-2xl font-bold tracking-normal leading-normal text-foreground mb-1">
              ChatGPT Wrapped
            </h1>
            <p className="text-[16px] text-foreground leading-relaxed">
              To download your data to generate your ChatGPT Wrapped, follow the
              instructions below.
            </p>
            <div className="mt-2 rounded-lg overflow-hidden border border-border">
              <img
                src="/chatgpt-data-tutorial.gif"
                alt="Tutorial showing how to export ChatGPT data"
                className="w-full h-auto"
              />
            </div>
            <div className="mt-2">
              <p className="text-[16px] text-foreground leading-relaxed">
                Drag and drop the zip file or folder anywhere on this screen to
                begin...
              </p>
            </div>
          </>

          {/* Chat messages - appear below instructions */}
          {showChatMessages && (
            <div className="mt-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="flex justify-end mb-4"
              >
                <div className="flex items-center gap-2 px-4 py-3 bg-muted rounded-2xl max-w-[80%]">
                  <IconFolder className="size-5 text-[#3B82F6] shrink-0" />
                  <span className="text-sm text-foreground">
                    {submittedFolderName}
                  </span>
                </div>
              </motion.div>

              {showProcessing && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                  className="flex justify-start mb-4"
                >
                  <div className="py-3 max-w-[80%]">
                    <span className="text-sm text-foreground">
                      Processing folder... It might take a while
                    </span>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Wrapped mode content - appears below chat messages */}
          {isWrappedMode && (
            <>
              {/* Slide 0: First Conversation */}
              {wrappedData && (
                <motion.div
                  ref={(el) => {
                    slideRefs.current[0] = el;
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className={cn('mt-8', hasReachedFirstSlide && 'snap-start')}
                >
                  <FirstConversationSlide data={wrappedData} />
                </motion.div>
              )}
              {/* Slide 1: Days Active */}
              {daysActiveData && (
                <motion.div
                  ref={(el) => {
                    slideRefs.current[1] = el;
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className={cn('mt-8', hasReachedFirstSlide && 'snap-start')}
                >
                  <DaysActiveSlide data={daysActiveData} />
                </motion.div>
              )}
              {/* Slide 2: Time of Day */}
              {timeOfDayData && (
                <motion.div
                  ref={(el) => {
                    slideRefs.current[2] = el;
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                  className={cn('mt-8', hasReachedFirstSlide && 'snap-start')}
                >
                  <TimeOfDaySlide data={timeOfDayData} />
                </motion.div>
              )}
              {/* Slide 3: Tools and Models */}
              {toolsAndModelsData && (
                <motion.div
                  ref={(el) => {
                    slideRefs.current[3] = el;
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                  className={cn('mt-8', hasReachedFirstSlide && 'snap-start')}
                >
                  <ToolsAndModelsSlide data={toolsAndModelsData} />
                </motion.div>
              )}
              {/* Slide 4: Generations Gallery */}
              {generationsData && (
                <motion.div
                  ref={(el) => {
                    slideRefs.current[4] = el;
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                  className={cn('mt-8', hasReachedFirstSlide && 'snap-start')}
                >
                  <GenerationsGallerySlide data={generationsData} />
                </motion.div>
              )}
              {/* Slide 5: Chats & Messages */}
              {chatsAndMessagesData && (
                <motion.div
                  ref={(el) => {
                    slideRefs.current[5] = el;
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                  className={cn('mt-8', hasReachedFirstSlide && 'snap-start')}
                >
                  <ChatsAndMessagesSlide data={chatsAndMessagesData} />
                </motion.div>
              )}
              {/* Slide 6: Finale */}
              {finaleSlideData && (
                <motion.div
                  ref={(el) => {
                    slideRefs.current[6] = el;
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                  className={cn('mt-8', hasReachedFirstSlide && 'snap-start')}
                >
                  <FinaleSlide data={finaleSlideData} />
                </motion.div>
              )}
              {/* Future slides will go here (slide 7, 8, etc.) */}
            </>
          )}
        </div>
      </div>

      <div className="w-full px-4 pt-4 border-border/50 bg-transparent border-t-0 opacity-100 pb-4">
        {isWrappedMode ? (
          <div className="flex justify-center">
            {currentSlide === getMaxSlide() ? (
              <a
                className="size-10 flex items-center justify-center"
                href="https://arjundabir.com"
              >
                <LogoAnimation />
              </a>
            ) : (
              <Button
                type="button"
                size="icon"
                className="size-10 rounded-full bg-white hover:bg-gray-100 border border-border shadow"
                onClick={() => {
                  const maxSlide = getMaxSlide();

                  if (currentSlide < maxSlide) {
                    // Move to next slide
                    setCurrentSlide(currentSlide + 1);
                  } else {
                    // If on last slide, scroll to bottom
                    setTimeout(() => {
                      if (scrollContainerRef.current) {
                        scrollContainerRef.current.scrollTo({
                          top: scrollContainerRef.current.scrollHeight,
                          behavior: 'smooth',
                        });
                      }
                    }, 50);
                  }
                }}
              >
                <IconArrowDown className="size-5 text-foreground" />
              </Button>
            )}
          </div>
        ) : (
          <>
            <form
              onSubmit={handleSubmit}
              className="group/composer w-full bg-transparent"
            >
              <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error - webkitdirectory is a non-standard attribute
                webkitdirectory=""
                directory=""
                className="sr-only"
                onChange={handleFolderSelect}
              />

              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                onChange={() => {}}
              />

              <input
                ref={zipInputRef}
                type="file"
                accept=".zip,application/zip,application/x-zip-compressed"
                className="sr-only"
                onChange={handleZipSelect}
              />

              <input
                ref={folderInputRef}
                type="file"
                // @ts-expect-error - webkitdirectory is a non-standard attribute
                webkitdirectory=""
                directory=""
                className="sr-only"
                onChange={handleFolderSelect}
              />

              <div
                onClick={handleInputClick}
                className={cn(
                  'w-full max-w-3xl mx-auto bg-transparent dark:bg-muted/50 cursor-pointer overflow-clip bg-clip-padding p-2.5 shadow-lg border border-border transition-all duration-200',
                  {
                    'rounded-3xl grid grid-cols-1 grid-rows-[auto_1fr_auto]':
                      isExpanded,
                    'rounded-[28px] grid grid-cols-[auto_1fr_auto] grid-rows-[auto_1fr_auto]':
                      !isExpanded,
                  }
                )}
                style={{
                  gridTemplateAreas: isExpanded
                    ? "'header' 'primary' 'footer'"
                    : "'header header header' 'leading primary trailing' '. footer .'",
                }}
              >
                {(selectedFolder || isExtractingZip) && (
                  <div
                    className="flex items-center gap-2 px-3 py-2 mb-2 bg-muted/50 rounded-xl"
                    style={{ gridArea: 'header' }}
                  >
                    <IconFolder className="size-5 text-[#3B82F6]" />
                    {isExtractingZip ? (
                      <>
                        <span className="text-sm text-foreground truncate">
                          {pendingZipFileName || 'Extracting...'}
                        </span>
                        <div className="ml-auto size-4 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
                      </>
                    ) : (
                      <>
                        <span className="text-sm text-foreground truncate">
                          {selectedFolder}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFolder(null);
                            setUploadedFiles(null);
                            setIsExtractingZip(false);
                            setPendingZipFileName(null);
                          }}
                          className="ml-auto text-muted-foreground hover:text-foreground"
                        >
                          <IconPlus className="size-4 rotate-45" />
                        </button>
                      </>
                    )}
                  </div>
                )}

                <div
                  className={cn(
                    'flex min-h-14 items-center overflow-x-hidden px-1.5',
                    {
                      'px-2 py-1 mb-0': isExpanded,
                      '-my-2.5': !isExpanded,
                    }
                  )}
                  style={{ gridArea: 'primary' }}
                >
                  <div className="flex-1 overflow-auto max-h-52">
                    <Textarea
                      onFocus={(e) => e.currentTarget.blur()}
                      ref={textareaRef}
                      value={message}
                      onChange={handleTextareaChange}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        selectedFolder
                          ? 'Now click submit'
                          : 'Upload ChatGPT Data folder or zip file here...'
                      }
                      className="min-h-0 resize-none rounded-none border-0 p-0 text-base placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin dark:bg-transparent cursor-copy"
                      rows={1}
                    />
                  </div>
                </div>

                <div
                  className={cn('flex', { hidden: isExpanded })}
                  style={{ gridArea: 'leading' }}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-accent outline-none ring-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconPlus className="size-6 text-muted-foreground" />
                  </Button>
                </div>

                <div
                  className="flex items-center gap-2"
                  style={{ gridArea: isExpanded ? 'footer' : 'trailing' }}
                >
                  <div className="ms-auto flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full hover:bg-accent"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <IconMicrophone className="size-5 text-muted-foreground" />
                    </Button>

                    <motion.div
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="icon"
                        disabled={isSubmitting || isExtractingZip}
                        className={cn(
                          'size-9 rounded-full relative bg-foreground',
                          selectedFolder ? 'opacity-100' : 'opacity-35',
                          (isSubmitting || isExtractingZip) &&
                            'opacity-50 cursor-not-allowed'
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconArrowUp className="size-5 text-background" />
                      </Button>
                    </motion.div>

                    {message.trim() && (
                      <Button
                        type="submit"
                        size="icon"
                        disabled={isSubmitting || isExtractingZip}
                        className={cn(
                          'size-9 rounded-full',
                          (isSubmitting || isExtractingZip) &&
                            'opacity-50 cursor-not-allowed'
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <IconSend className="size-5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Caption with GitHub link under input */}
            <p className="text-center text-sm text-muted-foreground mt-3 max-w-3xl mx-auto">
              <p>
                {'We never process or store your data. Everything stays local.'}
              </p>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
