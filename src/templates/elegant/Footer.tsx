import type { TemplateSectionProps } from "@/src/templates/types";

export default function Footer({ data }: TemplateSectionProps) {
  return (
    <footer className="border-t border-black/[.08] px-6 py-8 text-center text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-500">
      &copy; {new Date().getFullYear()} {data.settings.displayName}
    </footer>
  );
}
