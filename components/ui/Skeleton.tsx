import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

type SkeletonProps = {
  className?: string;
  rounded?: string;
};

function Skeleton({ className, rounded = "rounded-md" }: SkeletonProps) {
  return (
    <div
      className={twMerge(
        clsx("skeleton-shimmer", rounded, className),
      )}
    />
  );
}

type CardSkeletonProps = {
  lines?: number;
  className?: string;
};

function CardSkeleton({ lines = 3, className }: CardSkeletonProps) {
  return (
    <div
      className={twMerge(
        clsx("p-4 bg-white rounded-xl border border-slate-100 space-y-3", className),
      )}
    >
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

function CardGridSkeleton({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div
      className={twMerge(
        clsx("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", className),
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} lines={3} />
      ))}
    </div>
  );
}

function ListRowSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={twMerge(
        clsx("flex items-center gap-3 p-3 border-b border-slate-100", className),
      )}
    >
      <Skeleton className="h-10 w-10 shrink-0" rounded="rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="h-6 w-16 shrink-0" rounded="rounded-lg" />
    </div>
  );
}

function ListSkeleton({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={twMerge(clsx("bg-white rounded-xl border border-slate-100", className))}>
      {Array.from({ length: rows }).map((_, i) => (
        <ListRowSkeleton key={i} />
      ))}
    </div>
  );
}

function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
      <div className="flex border-b border-slate-200 bg-slate-50">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="flex-1 p-3">
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={c} className="flex-1 p-3">
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
        <Skeleton className="h-16 w-16 shrink-0" rounded="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20" rounded="rounded-lg" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 flex-1" rounded="rounded-lg" />
        ))}
      </div>
      <CardSkeleton lines={4} />
      <CardGridSkeleton count={2} />
    </div>
  );
}

function DetailPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-slate-100">
        <Skeleton className="h-14 w-14 shrink-0" rounded="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <CardGridSkeleton count={3} />
      <CardSkeleton lines={5} />
    </div>
  );
}

function StatsBarSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 bg-white rounded-xl border border-slate-100 space-y-2">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-6 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export {
  Skeleton,
  CardSkeleton,
  CardGridSkeleton,
  ListRowSkeleton,
  ListSkeleton,
  TableSkeleton,
  ProfileSkeleton,
  DetailPageSkeleton,
  StatsBarSkeleton,
};