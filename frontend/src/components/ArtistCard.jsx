import { Link } from 'react-router-dom'

function ArtistCard({ id, name, category, location, imageUrl }) {
  return (
    <Link
      to={`/artists/${id}`}
      className="block rounded-lg border border-zinc-800 bg-zinc-900 p-5 transition hover:border-violet-400"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="mb-4 h-32 w-full rounded-md object-cover"
        />
      ) : (
        <div className="mb-4 h-32 rounded-md bg-zinc-800" />
      )}

      <p className="text-sm font-semibold text-violet-400">{category}</p>
      <h3 className="mt-3 text-xl font-bold text-white">{name}</h3>
      <p className="mt-1 text-sm text-zinc-400">{location}</p>
    </Link>
  )
}

export default ArtistCard