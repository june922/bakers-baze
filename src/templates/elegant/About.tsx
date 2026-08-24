import type { TemplateSectionProps } from "@/src/templates/types";

export default function About({ data }: TemplateSectionProps) {
  const { settings } = data;
  const hasContact = settings.contactEmail || settings.contactPhone || settings.address;

  if (!settings.aboutText && !hasContact) return null;

  return (
    <section className="border-t border-black/[.08] bg-[#fbf7f2] px-6 py-12 dark:border-white/[.145] dark:bg-[#1a1512]">
      <div className="mx-auto grid max-w-5xl gap-8 sm:grid-cols-2">
        {settings.aboutText && (
          <div>
            <h2 className="mb-3 text-xl font-semibold">About</h2>
            <p className="whitespace-pre-line text-zinc-700 dark:text-zinc-300">{settings.aboutText}</p>
          </div>
        )}
        {hasContact && (
          <div>
            <h2 className="mb-3 text-xl font-semibold">Contact</h2>
            <ul className="flex flex-col gap-1 text-zinc-700 dark:text-zinc-300">
              {settings.contactEmail && <li>{settings.contactEmail}</li>}
              {settings.contactPhone && <li>{settings.contactPhone}</li>}
              {settings.address && <li>{settings.address}</li>}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
