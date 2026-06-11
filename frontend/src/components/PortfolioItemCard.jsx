import { Link } from 'react-router-dom'

const mediaTypeLabels = {
  IMAGE: 'Imagen',
  VIDEO: 'Video',
  AUDIO: 'Audio',
  EMBED: 'Embed',
}

function PortfolioItemCard({
  id,
  title,
  description,
  mediaType,
  mediaUrl,
  thumbnailUrl,
  artistName,
  viewCount = 0,
  likeCount = 0,
}) {
  const imageUrl = thumbnailUrl || mediaUrl

  return (
    <Link
      to={`/portfolio/${id}`}
      className="block overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 transition hover:border-violet-400"
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          className="h-32 w-full object-cover"
        />
      ) : (
        <div className="h-32 bg-zinc-800" />
      )}

      <div className="p-5">
        <p className="text-sm font-medium text-violet-400">
          {mediaTypeLabels[mediaType] ?? mediaType}
        </p>

        <h3 className="mt-2 text-lg font-bold text-white">{title}</h3>

        <p className="mt-1 text-sm text-zinc-400">{artistName}</p>

        <div className="mt-3 flex gap-3 text-xs font-medium text-zinc-500">
          <span>{viewCount} vistas</span>
          <span>{likeCount} me gusta</span>
        </div>

        {description && (
          <p className="mt-3 text-sm leading-6 text-zinc-300">
            {description}
          </p>
        )}
      </div>
    </Link>
  )
}

export default PortfolioItemCard
