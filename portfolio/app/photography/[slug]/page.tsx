import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'

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

function getCollection(slug: string): Collection | null {
  const filePath = path.join(process.cwd(), 'data', 'photography', `${slug}.json`)
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(fileContents)
  } catch {
    return null
  }
}

function getAllCollectionSlugs(): string[] {
  const photographyDir = path.join(process.cwd(), 'data', 'photography')
  const filenames = fs.readdirSync(photographyDir)
  return filenames
    .filter(filename => filename.endsWith('.json'))
    .map(filename => filename.replace('.json', ''))
}

export async function generateStaticParams() {
  const slugs = getAllCollectionSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const collection = getCollection(slug)

  if (!collection) {
    return { title: 'Collection Not Found' }
  }

  return {
    title: `${collection.title} | Photography | Kasey McDonnell`,
    description: collection.description,
  }
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const collection = getCollection(slug)

  if (!collection || !collection.published) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="container mx-auto px-6 py-20">
        <Link
          href="/photography"
          className="inline-flex items-center text-brand-yellow hover:underline mb-8"
        >
          ← Back to Photography
        </Link>

        <h1 className="hero-title mb-4">{collection.title}</h1>
        <p className="text-xl text-gray-300 max-w-2xl">
          {collection.description}
        </p>
      </section>

      {/* Photo Grid */}
      <section className="container mx-auto px-6 pb-20">
        {collection.photos && collection.photos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {collection.photos.map((photo, index) => {
              const heights = ['aspect-square', 'aspect-[4/3]', 'aspect-[3/4]', 'aspect-video']
              const height = heights[index % heights.length]

              return (
                <div
                  key={index}
                  className={`relative ${height} overflow-hidden group cursor-pointer rounded-lg`}
                >
                  <Image
                    src={photo.image}
                    alt={photo.caption || `${collection.title} ${index + 1}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {photo.caption && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white text-sm">{photo.caption}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="relative aspect-[21/9] rounded-lg overflow-hidden">
            <Image
              src={collection.coverImage || '/images/placeholder.jpg'}
              alt={collection.title}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
            Interested in my photography?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Get in touch to discuss prints, licensing, or collaborations.
          </p>
          <Link
            href="/contact"
            className="inline-block px-8 py-3 bg-brand-yellow text-brand-dark font-sans rounded-full hover:bg-yellow-300 transition-colors"
          >
            Contact me
          </Link>
        </div>
      </section>
    </div>
  )
}
