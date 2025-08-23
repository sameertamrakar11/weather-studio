export default function FavoritesList({ favorites, onSelect }) {
  if (!favorites.length) return null;
  return (
    <div className="flex gap-2 mb-4 flex-wrap">
      {favorites.map((fav, idx) => (
        <button key={idx} onClick={() => onSelect(fav)} className="px-3 py-1 bg-gray-300 dark:bg-gray-700 rounded">
          {fav}
        </button>
      ))}
    </div>
  );
}