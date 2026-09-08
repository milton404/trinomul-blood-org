"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatTimeAgo } from "@/lib/format-time";

export interface StorySlide {
  id: string;
  imageUrl: string | null;
  content: string;
  createdAt: string;
}

export interface FeedStory {
  id: string | number;
  name: string;
  avatarUrl: string | null;
  initials: string;
  slides: StorySlide[];
}

const SLIDE_MS = 5000;

function storyInitials(name: string): string {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}

export default function FeedStoryViewer({
  stories,
  startIndex,
  onClose,
}: {
  stories: FeedStory[];
  startIndex: number;
  onClose: () => void;
}) {
  const [storyIdx, setStoryIdx] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(stories.length - 1, 0)),
  );
  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  const close = useCallback(() => onClose(), [onClose]);

  const next = useCallback(() => {
    if (storyIdx + 1 < stories.length) {
      setStoryIdx((i) => i + 1);
      setSlideIdx(0);
    } else {
      close();
    }
  }, [storyIdx, stories.length, close]);

  const prev = useCallback(() => {
    if (slideIdx > 0) {
      setSlideIdx((i) => i - 1);
    } else if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
      setSlideIdx(stories[storyIdx - 1].slides.length - 1);
    }
  }, [slideIdx, storyIdx, stories]);

  const advance = useCallback(() => {
    const s = stories[storyIdx];
    if (!s) return close();
    if (slideIdx + 1 < s.slides.length) {
      setSlideIdx((i) => i + 1);
    } else {
      next();
    }
  }, [slideIdx, storyIdx, stories, next, close]);

  // Clamp in case the feed refreshes and slides shift while open.
  useEffect(() => {
    if (stories.length === 0) return;
    if (storyIdx >= stories.length) {
      setStoryIdx(0);
      setSlideIdx(0);
    } else if (slideIdx >= stories[storyIdx].slides.length) {
      setSlideIdx(0);
    }
  }, [stories, storyIdx, slideIdx]);

  useEffect(() => {
    if (paused) return;
    const t = setTimeout(advance, SLIDE_MS);
    return () => clearTimeout(t);
  }, [paused, storyIdx, slideIdx, advance]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") advance();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, prev, close]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const story = stories[storyIdx];
  const slide = story?.slides[slideIdx];

  if (!story || !slide) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black select-none">
      <div className="relative h-full w-full max-w-[430px] overflow-hidden bg-black sm:rounded-none">
        {/* Slide */}
        <div className="absolute inset-0">
          {slide.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-contain"
              />
              {slide.content && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-6 pt-14">
                  <p className="line-clamp-4 break-words text-sm leading-relaxed text-white/90">
                    {slide.content}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-red-600 via-rose-600 to-slate-900 px-6">
              <p className="break-words text-center text-lg font-semibold leading-relaxed text-white">
                {slide.content}
              </p>
            </div>
          )}
        </div>

        {/* Progress bars */}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-2 pt-2">
          {story.slides.map((s, i) => {
            const state =
              i < slideIdx ? "done" : i === slideIdx ? "active" : "pending";
            return (
              <div
                key={s.id}
                className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30"
              >
                {state === "done" && <div className="h-full w-full bg-white" />}
                {state === "active" && (
                  <div
                    key={slideIdx}
                    className="story-progress-animate h-full w-full bg-white"
                    style={{
                      animationPlayState: paused ? "paused" : "running",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Header */}
        <div className="absolute inset-x-0 top-3 z-20 flex items-center gap-2.5 px-3 pt-2">
          {story.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={story.avatarUrl}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-xs font-bold text-white">
              {storyInitials(story.name || "")}
            </div>
          )}
          <span className="truncate text-sm font-semibold text-white">
            {story.name}
          </span>
          <span className="text-xs text-white/60">
            {formatTimeAgo(slide.createdAt)}
          </span>
          <button
            onClick={close}
            aria-label="Close"
            className="ml-auto rounded-full p-1.5 text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tap zones: left = prev, center = hold to pause, right = next */}
        <div className="absolute inset-0 z-10 flex">
          <button
            aria-label="Previous"
            onClick={prev}
            className="h-full w-1/3 cursor-pointer focus:outline-none"
          />
          <button
            aria-label="Pause"
            className="h-full flex-1 cursor-pointer focus:outline-none"
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
            onTouchCancel={() => setPaused(false)}
            onMouseDown={() => setPaused(true)}
            onMouseUp={() => setPaused(false)}
            onMouseLeave={() => setPaused(false)}
          />
          <button
            aria-label="Next"
            onClick={advance}
            className="h-full w-1/3 cursor-pointer focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}