import { ProductCarousel } from './ProductCarousel';
import { LATEST_RELEASE_URL } from '@/lib/links';

export function Hero() {
  return (
    <section className="relative grain pt-20 pb-28 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-tag-soft text-tag font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-tag" />
            v0.1 · for macOS
          </div>

          <h1 className="font-serif text-[64px] md:text-[80px] leading-[0.98] tracking-[-0.025em] font-semibold text-ink mb-7">
            A quiet second brain.
          </h1>

          <p className="font-serif text-[20px] md:text-[22px] leading-[1.55] text-ink-2 max-w-2xl mb-10">
            Side is a notes app for thinkers who don&apos;t trust the cloud. Notion-easy
            editing, Obsidian-deep linking — but every note stays as a plain
            markdown file on your Mac.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <a
              href={LATEST_RELEASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-accent text-paper font-medium text-[14px] hover:bg-accent-ink transition-colors"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <path d="M7 10l5 5 5-5" />
                <path d="M12 15V3" />
              </svg>
              Get Side for macOS
            </a>
            <a
              href="#preview"
              className="inline-flex items-center gap-2 h-11 px-5 rounded-md border border-rule text-ink hover:bg-paper-2 transition-colors text-[14px]"
            >
              See how it works
            </a>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[11.5px] uppercase tracking-[0.08em] text-ink-3">
            <span>Free · Open source</span>
            <span className="text-ink-4">·</span>
            <span>Plain markdown on disk</span>
            <span className="text-ink-4">·</span>
            <span>No account required</span>
          </div>
        </div>

        <div className="mt-20">
          <ProductCarousel />
        </div>
      </div>
    </section>
  );
}
