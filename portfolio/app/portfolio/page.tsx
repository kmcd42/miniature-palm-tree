import Image from 'next/image'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portfolio | Kasey McDonnell',
  description: 'View my portfolio of design, photography, and creative projects.',
}

// This would typically come from a CMS or JSON file
const projects = [
  {
    id: 'bolton-hotel',
    title: 'bolton hotel',
    description: 'Brand design and visual identity',
    image: '/images/projects/bolton-hotel.jpg',
  },
  {
    id: 'karawhiua',
    title: 'karawhiua',
    description: 'Digital design and user experience',
    image: '/images/projects/karawhiua.jpg',
  },
  {
    id: 'silverstripe',
    title: 'silverstripe',
    description: 'Marketing and visual design',
    image: '/images/projects/silverstripe.jpg',
  },
  {
    id: 'world-of-wearableart',
    title: 'world of wearableart',
    description: 'Campaign design and photography',
    image: '/images/projects/wearableart.jpg',
  },
  {
    id: 'doctor-who',
    title: 'doctor who',
    description: 'Event design and promotion',
    image: '/images/projects/doctor-who.jpg',
  },
  {
    id: 'nice-little-palaces',
    title: 'nice little palaces',
    description: 'Photography and visual storytelling',
    image: '/images/projects/nice-little-palaces.jpg',
  },
  {
    id: 'project-zero',
    title: 'project zero',
    description: 'Brand strategy and design',
    image: '/images/projects/project-zero.jpg',
  },
]

export default function PortfolioPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="container mx-auto px-6 py-20">
        <h1 className="hero-title mb-4">Portfolio</h1>
        <p className="text-xl text-gray-300 max-w-2xl">
          A selection of projects showcasing design, photography, and creative work across various mediums.
        </p>
      </section>

      {/* Projects Grid */}
      <section className="container mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-1">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="group relative aspect-square overflow-hidden cursor-pointer bg-brand-dark"
            >
              <Image
                src={project.image}
                alt={project.title}
                fill
                className="object-cover transition-all duration-500 group-hover:scale-110 group-hover:opacity-50"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h3 className="text-2xl font-serif font-bold text-brand-yellow mb-2">
                    {project.title}
                  </h3>
                  <p className="text-white/90 text-sm">
                    {project.description}
                  </p>
                </div>
              </div>

              {/* Title overlay for mobile */}
              <div className="md:hidden absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-lg font-serif font-bold text-white">
                  {project.title}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
            Interested in working together?
          </h2>
          <p className="text-lg text-gray-300 mb-8">
            Let's discuss how I can help bring your next project to life.
          </p>
          <a
            href="/contact"
            className="inline-block px-8 py-3 bg-brand-yellow text-brand-dark font-sans rounded-full hover:bg-yellow-300 transition-colors"
          >
            Get in touch
          </a>
        </div>
      </section>
    </div>
  )
}
