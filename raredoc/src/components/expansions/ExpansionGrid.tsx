interface SetItem {
  id: string;
  name: string;
  nameKo: string | null;
  series: string;
  releaseDate: Date;
  cardCount: number;
  logoUrl: string | null;
}

export function ExpansionGrid({ sets }: { sets: SetItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {sets.map((set) => (
        <ExpansionCard key={set.id} set={set} />
      ))}
    </div>
  );
}

function ExpansionCard({ set }: { set: SetItem }) {
  const releaseYear = new Date(set.releaseDate).getFullYear();
  return (
    <a
      href={`./expansions/${set.id}`}
      className="group block rounded-lg border border-gray-800 bg-gray-900 hover:border-gray-600 hover:bg-gray-800 transition-all p-3"
    >
      <div className="aspect-video flex items-center justify-center mb-3 bg-gray-800 rounded overflow-hidden">
        {set.logoUrl ? (
          <img
            src={set.logoUrl}
            alt={set.name}
            className="max-h-full max-w-full object-contain p-1 group-hover:scale-105 transition-transform"
            loading="lazy"
          />
        ) : (
          <span className="text-2xl text-gray-600">📦</span>
        )}
      </div>
      <p className="text-xs font-medium text-white truncate">{set.nameKo ?? set.name}</p>
      <p className="text-xs text-gray-500 mt-0.5">{releaseYear} · {set.cardCount}장</p>
    </a>
  );
}
