import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import ReactMarkdown from 'react-markdown'

interface CustomPage {
  title: string
  slug: string
  description?: string
  heroImage?: string
  body: string
  published: boolean
}

function getPage(slug: string): CustomPage | null {
  const pagesDir = path.join(process.cwd(), 'data', 'custom-pages')

  // Check if directory exists
  if (!fs.existsSync(pagesDir)) {
    return null
  }

  const filenames = fs.readdirSync(pagesDir)

  for (const filename of filenames) {
    if (!filename.endsWith('.json')) continue

    const filePath = path.join(pagesDir, filename)
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const page = JSON.parse(fileContents) as CustomPage

    if (page.slug === slug) {
      return page
    }
  }

  return null
}

function getAllPageSlugs(): string[] {
  const pagesDir = path.join(process.cwd(), 'data', 'custom-pages')

  if (!fs.existsSync(pagesDir)) {
    return []
  }

  const filenames = fs.readdirSync(pagesDir)
  return filenames
    .filter(filename => filename.endsWith('.json'))
    .map(filename => {
      const filePath = path.join(pagesDir, filename)
      const fileContents = fs.readFileSync(filePath, 'utf8')
      const page = JSON.parse(fileContents) as CustomPage
      return page.slug
    })
    .filter(Boolean)
}

export async function generateStaticParams() {
  const slugs = getAllPageSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const page = getPage(slug)

  if (!page) {
    return { title: 'Page Not Found' }
  }

  return {
    title: `${page.title} | Kasey McDonnell`,
    description: page.description || '',
  }
}

export default async function CustomPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = getPage(slug)

  if (!page || !page.published) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      {page.heroImage && (
        <section className="relative h-[40vh] min-h-[300px]">
          <Image
            src={page.heroImage}
            alt={page.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-dark to-transparent" />
        </section>
      )}

      {/* Content */}
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="hero-title mb-8">{page.title}</h1>

          <div className="prose prose-invert prose-lg max-w-none">
            <ReactMarkdown>{page.body}</ReactMarkdown>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
            Want to know more?
          </h2>
          <Link
            href="/contact"
            className="inline-block px-8 py-3 bg-brand-yellow text-brand-dark font-sans rounded-full hover:bg-yellow-300 transition-colors"
          >
            Get in touch
          </Link>
        </div>
      </section>
    </div>
  )
}
