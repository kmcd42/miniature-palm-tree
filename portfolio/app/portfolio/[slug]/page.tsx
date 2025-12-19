import Image from 'next/image'
import Link from 'next/link'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'

interface Project {
  title: string
  description: string
  category: string
  featured: boolean
  image: string
  gallery: string[]
  client: string
  year: string
  published: boolean
}

function getProject(slug: string): Project | null {
  const filePath = path.join(process.cwd(), 'data', 'projects', `${slug}.json`)
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(fileContents)
  } catch {
    return null
  }
}

function getAllProjectSlugs(): string[] {
  const projectsDir = path.join(process.cwd(), 'data', 'projects')
  const filenames = fs.readdirSync(projectsDir)
  return filenames
    .filter(filename => filename.endsWith('.json'))
    .map(filename => filename.replace('.json', ''))
}

export async function generateStaticParams() {
  const slugs = getAllProjectSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const project = getProject(slug)

  if (!project) {
    return { title: 'Project Not Found' }
  }

  return {
    title: `${project.title} | Kasey McDonnell`,
    description: project.description,
  }
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const project = getProject(slug)

  if (!project || !project.published) {
    notFound()
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="container mx-auto px-6 py-20">
        <Link
          href="/portfolio"
          className="inline-flex items-center text-brand-yellow hover:underline mb-8"
        >
          ← Back to Portfolio
        </Link>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <h1 className="hero-title mb-4">{project.title}</h1>
            <p className="text-xl text-gray-300 mb-8">{project.description}</p>

            <div className="space-y-4">
              {project.category && (
                <div>
                  <span className="text-gray-400 text-sm">Category</span>
                  <p className="text-white">{project.category}</p>
                </div>
              )}
              {project.client && (
                <div>
                  <span className="text-gray-400 text-sm">Client</span>
                  <p className="text-white">{project.client}</p>
                </div>
              )}
              {project.year && (
                <div>
                  <span className="text-gray-400 text-sm">Year</span>
                  <p className="text-white">{project.year}</p>
                </div>
              )}
            </div>
          </div>

          <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
            <Image
              src={project.image || '/images/placeholder.jpg'}
              alt={project.title}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
      </section>

      {/* Gallery */}
      {project.gallery && project.gallery.length > 0 && (
        <section className="container mx-auto px-6 pb-20">
          <h2 className="section-title mb-8">Gallery</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.gallery.map((image, index) => (
              <div key={index} className="relative aspect-[4/3] rounded-lg overflow-hidden">
                <Image
                  src={image}
                  alt={`${project.title} gallery ${index + 1}`}
                  fill
                  className="object-cover hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
            Like what you see?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Let's discuss how I can help with your next project.
          </p>
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
