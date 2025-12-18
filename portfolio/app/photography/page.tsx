import Image from 'next/image'
import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Photography | Kasey McDonnell',
  description: 'Photography portfolio featuring abstract, landscape, and documentary work.',
}

// Photography collections - would come from CMS/JSON
const collections = [
  {
    id: 'abstract',
    title: 'abstract photography',
    description: 'Experimental and abstract visual exploration',
    count: 12,
    coverImage: '/images/photography/abstract-cover.jpg',
  },
  {
    id: 'urban',
    title: 'urban landscapes',
    description: 'Cityscapes and architectural photography',
    count: 18,
    coverImage: '/images/photography/urban-cover.jpg',
  },
  {
    id: 'documentary',
    title: 'documentary',
    description: 'Social and documentary photography projects',
    count: 24,
    coverImage: '/images/photography/documentary-cover.jpg',
  },
]

export default function PhotographyPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="container mx-auto px-6 py-20">
        <h1 className="hero-title mb-4">Photography</h1>
        <p className="text-xl text-gray-300 max-w-2xl">
          Exploring visual storytelling through various photographic mediums and styles.
        </p>
      </section>

      {/* Collections */}
      <section className="container mx-auto px-6 pb-20">
        <div className="space-y-24">
          {collections.map((collection, index) => (
            <div key={collection.id}>
              <div className="mb-8">
                <h2 className="text-4xl md:text-5xl font-serif font-bold mb-3">
                  {collection.title}
                </h2>
                <p className="text-gray-400">
                  {collection.description} · {collection.count} images
                </p>
              </div>

              {/* Gallery Grid - Masonry-style */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {Array.from({ length: 8 }).map((_, i) => {
                  // Vary heights for masonry effect
                  const heights = ['aspect-square', 'aspect-[4/3]', 'aspect-[3/4]', 'aspect-video']
                  const height = heights[i % heights.length]

                  return (
                    <div
                      key={i}
                      className={`relative ${height} overflow-hidden group cursor-pointer`}
                    >
                      <Image
                        src={`/images/photography/${collection.id}-${i + 1}.jpg`}
                        alt={`${collection.title} ${i + 1}`}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                    </div>
                  )
                })}
              </div>

              <div className="mt-8 text-center">
                <Link
                  href={`/photography/${collection.id}`}
                  className="inline-flex items-center gap-2 text-brand-yellow hover:underline"
                >
                  View full collection →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
