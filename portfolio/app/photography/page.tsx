import Image from 'next/image'
import { Metadata } from 'next'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'

export const metadata: Metadata = {
  title: 'Photography | Kasey McDonnell',
  description: 'Photography portfolio featuring abstract, landscape, and documentary work.',
}

interface Photo {
  image: string
  caption?: string
}

interface Collection {
  title: string
  description: string
  coverImage: string
  photos: Photo[]
  published: boolean
}

function getAllCollections(): (Collection & { slug: string })[] {
  const photographyDir = path.join(process.cwd(), 'data', 'photography')
  const filenames = fs.readdirSync(photographyDir)

  return filenames
    .filter(filename => filename.endsWith('.json'))
    .map(filename => {
      const filePath = path.join(photographyDir, filename)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const collection = JSON.parse(fileContents) as Collection
      const slug = filename.replace('.json', '')
      return { ...collection, slug }
    })
    .filter(collection => collection.published)
}

export default function PhotographyPage() {
  const collections = getAllCollections()
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
          {collections.map((collection) => (
            <div key={collection.slug}>
              <div className="mb-8">
                <h2 className="text-4xl md:text-5xl font-serif font-bold mb-3">
                  {collection.title}
                </h2>
                <p className="text-gray-400">
                  {collection.description}{collection.photos.length > 0 && ` · ${collection.photos.length} images`}
                </p>
              </div>

              {/* Gallery Grid - Masonry-style */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {collection.photos.length > 0 ? (
                  collection.photos.slice(0, 8).map((photo, i) => {
                    const heights = ['aspect-square', 'aspect-[4/3]', 'aspect-[3/4]', 'aspect-video']
                    const height = heights[i % heights.length]

                    return (
                      <div
                        key={i}
                        className={`relative ${height} overflow-hidden group cursor-pointer`}
                      >
                        <Image
                          src={photo.image}
                          alt={photo.caption || `${collection.title} ${i + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-full relative aspect-[21/9] overflow-hidden group cursor-pointer">
                    <Image
                      src={collection.coverImage || '/images/placeholder.jpg'}
                      alt={collection.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="100vw"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300" />
                  </div>
                )}
              </div>

              <div className="mt-8 text-center">
                <Link
                  href={`/photography/${collection.slug}`}
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
