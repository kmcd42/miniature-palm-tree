import Image from 'next/image'
import Link from 'next/link'
import fs from 'fs'
import path from 'path'

interface HomeData {
  greeting: string
  intro: string
  heroImage: string
  featuredWork: string[]
}

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

function getHomeData(): HomeData {
  const filePath = path.join(process.cwd(), 'data', 'pages', 'home.json')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(fileContents)
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

function getFeaturedProjects(slugs: string[]): (Project & { slug: string })[] {
  return slugs
    .map(slug => {
      const project = getProject(slug)
      return project ? { ...project, slug } : null
    })
    .filter((p): p is Project & { slug: string } => p !== null && p.published)
}

export default function Home() {
  const homeData = getHomeData()
  const featuredProjects = getFeaturedProjects(homeData.featuredWork)

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[80vh]">
          {/* Left: Text */}
          <div>
            <h1 className="hero-title mb-8">
              {homeData.greeting}
            </h1>

            {/* Hero Image for mobile */}
            <div className="lg:hidden mb-8 relative aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src={homeData.heroImage}
                alt="Portfolio hero image"
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            <div className="text-lg md:text-xl space-y-6 max-w-2xl">
              <p>
                {homeData.intro}
              </p>

              <div className="flex gap-4 pt-8">
                <Link
                  href="/portfolio"
                  className="px-8 py-3 border-2 border-brand-yellow text-brand-yellow font-sans rounded-full hover:bg-brand-yellow hover:text-brand-dark transition-all"
                >
                  portfolio
                </Link>
                <Link
                  href="/contact"
                  className="px-8 py-3 bg-brand-yellow text-brand-dark font-sans rounded-full hover:bg-yellow-300 transition-colors"
                >
                  contact
                </Link>
              </div>
            </div>
          </div>

          {/* Right: Hero Image for desktop */}
          <div className="hidden lg:block relative aspect-[4/3] rounded-lg overflow-hidden">
            <Image
              src={homeData.heroImage}
              alt="Portfolio hero image"
              fill
              className="object-cover"
              priority
              sizes="50vw"
            />
          </div>
        </div>
      </section>

      {/* Featured Work Preview */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="flex justify-between items-center mb-12">
          <h2 className="section-title">Featured Work</h2>
          <Link
            href="/portfolio"
            className="text-brand-yellow hover:underline"
          >
            View all →
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuredProjects.map((project) => (
            <Link key={project.slug} href={`/portfolio/${project.slug}`} className="group cursor-pointer">
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-4">
                <Image
                  src={project.image || '/images/placeholder.jpg'}
                  alt={project.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <h3 className="text-xl font-serif mb-2 group-hover:text-brand-yellow transition-colors">
                {project.title}
              </h3>
              <p className="text-gray-400 text-sm">
                {project.description}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
