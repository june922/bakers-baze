import type { TemplateSectionProps } from "@/src/templates/types";

export default function Hero({ data }: TemplateSectionProps) {
  const { settings } = data;

  return (
    <section
      className="relative flex min-h-[320px] flex-col items-center justify-center gap-3 bg-cover bg-center px-6 py-24 text-center text-white"
      style={{
        backgroundImage: settings.heroImageUrl
          ? `linear-gradient(rgba(20,14,10,0.45), rgba(20,14,10,0.45)), url(${settings.heroImageUrl})`
          : "linear-gradient(135deg, var(--accent), #4a2f1f)",
      }}
    >
      <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">{settings.displayName}</h1>
      {settings.tagline && <p className="max-w-xl text-lg text-white/90">{settings.tagline}</p>}
    </section>
  );
}
