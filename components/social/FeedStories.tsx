"use client";

import { useMemo } from "react";
import { Plus } from "lucide-react";

interface Story {
  id: string | number;
  name: string;
  avatarUrl: string | null;
  initials: string;
  isLive?: boolean;
}

interface FeedStoriesProps {
  stories: Story[];
  onStoryPress?: (story: Story) => void;
  youStory?: {
    onClick: () => void;
    avatarUrl?: string | null;
    initials?: string;
    hasStory?: boolean;
    label?: string;
  };
}

function storyInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function FeedStories({ stories, onStoryPress, youStory }: FeedStoriesProps) {
  const uniqueStories = useMemo(() => {
    const seen = new Set<string | number>();
    return stories.filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [stories]);

  if (uniqueStories.length === 0 && !youStory) return null;

  return (
    <div className="relative -mx-3 sm:-mx-5 px-3 sm:px-5 py-3 bg-white border-b border-slate-100">
      <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory -mx-1 px-1">
        {youStory && (
          <button
            type="button"
            onClick={youStory.onClick}
            className="flex flex-col items-center gap-1.5 shrink-0 w-18 group snap-center"
            aria-label={youStory.label || "Your story"}
          >
            <div className="relative p-[2px] rounded-full bg-slate-200 group-active:scale-95 transition-transform duration-200">
              <div className="overflow-hidden rounded-full bg-white p-[2px]">
                {youStory.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={youStory.avatarUrl}
                    alt={youStory.label || "Your story"}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center bg-gradient-to-br from-red-100 to-rose-200 text-red-700 font-bold text-sm">
                    {youStory.initials || "U"}
                  </div>
                )}
              </div>
              <span className="absolute -bottom-0.5 right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white shadow-sm ring-2 ring-white">
                <Plus className="h-3 w-3" />
              </span>
            </div>
            <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 max-w-[60px] truncate text-center">
              {youStory.label || "Your story"}
            </span>
          </button>
        )}
        {uniqueStories.map((story) => {
          const initials = story.initials || storyInitials(story.name);
          return (
            <button
              key={story.id}
              type="button"
              onClick={() => onStoryPress?.(story)}
              className="flex flex-col items-center gap-1.5 shrink-0 w-18 group snap-center"
              aria-label={story.name}
            >
              <div
                className={`relative p-[2px] rounded-full transition-transform duration-200 group-active:scale-95 ${
                  story.isLive
                    ? "bg-gradient-to-r from-red-500 via-rose-500 to-amber-500 ring-2 ring-red-200"
                    : "bg-gradient-to-r from-red-500 via-rose-400 to-amber-400"
                }`}
              >
                <div className="overflow-hidden rounded-full bg-white p-[2px]">
                  {story.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={story.avatarUrl}
                      alt={story.name}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center bg-gradient-to-br from-red-100 to-rose-200 text-red-700 font-bold text-sm">
                      {initials}
                    </div>
                  )}
                </div>
                {story.isLive && (
                  <span className="absolute -bottom-0.5 right-0.5 px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-black uppercase tracking-wider shadow-sm">
                    LIVE
                  </span>
                )}
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-600 max-w-[60px] truncate text-center">
                {story.name.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}