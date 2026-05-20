import { useTranslations } from "next-intl";
import { Container } from "@/components/toss";

export function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="border-t border-toss-divider mt-16 py-8 bg-toss-bg-base">
      <Container size="xl" padding="md">
        <p className="text-toss-caption text-toss-text-tertiary leading-relaxed">
          {t("disclaimer")}
        </p>
        <p className="text-toss-micro text-toss-text-quaternary mt-2">
          © 2026 Raredoc. Not affiliated with The Pokémon Company.
        </p>
      </Container>
    </footer>
  );
}
