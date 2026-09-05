'use client';

export default function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-red-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg focus:font-semibold focus:outline-none focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
}
