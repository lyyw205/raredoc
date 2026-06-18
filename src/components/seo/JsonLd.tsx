import { SITE_BASE_URL as BASE_URL } from "@/lib/constants";

interface Props {
  data: Record<string, unknown>;
}

export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebSiteJsonLd({ locale }: { locale: string }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "Raredoc",
        alternateName: locale === "ko" ? "레어독" : "Raredoc",
        url: BASE_URL,
        description:
          locale === "ko"
            ? "포켓몬 카드 시세, 투자 티어리스트, 확장팩 정보 사이트"
            : "Pokémon card prices, investment tier lists, and expansion info",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${BASE_URL}/${locale}/dex?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}

export function BreadcrumbJsonLd({
  items,
}: {
  items: { name: string; url: string }[];
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

export function ProductJsonLd({
  name,
  description,
  image,
  price,
}: {
  name: string;
  description: string;
  image: string;
  price?: number;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        description,
        image,
        ...(price != null && {
          offers: {
            "@type": "Offer",
            price: price.toFixed(2),
            priceCurrency: "USD",
            availability: "https://schema.org/InStock",
          },
        }),
        brand: {
          "@type": "Brand",
          name: "The Pokémon Company",
        },
      }}
    />
  );
}
