import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => "en",
  getTranslations: () => (key: string) => key,
}));

vi.mock("@/i18n/routing", () => ({
  Link: function MockLink({ children, ...props }: any) {
    return { type: "a", props: { ...props, children } };
  },
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  redirect: vi.fn(),
}));
