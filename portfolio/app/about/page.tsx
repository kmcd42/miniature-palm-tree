import Image from 'next/image'
import { Metadata } from 'next'
import fs from 'fs'
import path from 'path'

export const metadata: Metadata = {
  title: 'About | Kasey McDonnell',
  description: 'Learn more about Kasey McDonnell - designer, writer, photographer, and marketer.',
}

interface Experience {
  role: string
  company: string
  period: string
  description: string
}

interface AboutData {
  title: string
  bio: string[]
  skills: string[]
  experience: Experience[]
}

function getAboutData(): AboutData {
  const filePath = path.join(process.cwd(), 'data', 'pages', 'about.json')
  const fileContents = fs.readFileSync(filePath, 'utf8')
  return JSON.parse(fileContents)
}

export default function AboutPage() {
  const aboutData = getAboutData()

  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div>
            <h1 className="hero-title mb-8">
              Kia ora, ko Kasey ahau
            </h1>

            <div className="space-y-6 text-lg">
              {aboutData.bio.map((paragraph, index) => (
                <p key={index} className={index === 2 ? 'font-semibold' : ''}>
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-12 space-y-4">
              <h2 className="text-2xl font-serif font-bold mb-4">Skills</h2>
              <div className="grid grid-cols-2 gap-4">
                {aboutData.skills.map((skill) => (
                  <div
                    key={skill}
                    className="px-4 py-2 border border-white/20 rounded-lg text-sm hover:border-brand-yellow transition-colors"
                  >
                    {skill}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Image */}
          <div className="relative aspect-[3/4] rounded-lg overflow-hidden">
            <Image
              src="/images/about-photo.jpg"
              alt="Kasey McDonnell"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </div>
        </div>
      </section>

      {/* CV Section */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10">
        <h2 className="section-title mb-12">Experience</h2>

        <div className="space-y-12 max-w-4xl">
          {aboutData.experience.map((exp, index) => (
            <div key={index} className={`border-l-2 ${index === 0 ? 'border-brand-yellow' : 'border-white/20'} pl-6`}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-serif font-bold">{exp.role}</h3>
                <span className="text-gray-400">{exp.period}</span>
              </div>
              <p className="text-brand-yellow mb-3">{exp.company}</p>
              <p className="text-gray-300">{exp.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="section-title mb-6">Let's work together</h2>
          <p className="text-lg text-gray-300 mb-12">
            Interested in collaborating? Get in touch to discuss your next project.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a
              href="mailto:hello@kaseymcdonnell.co.nz"
              className="px-8 py-4 bg-brand-yellow text-brand-dark font-sans font-semibold rounded-full hover:bg-yellow-300 transition-colors"
            >
              Email Me
            </a>
            <div className="flex gap-4">
              <a
                href="https://www.linkedin.com/in/your-profile"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-yellow hover:underline"
              >
                LinkedIn
              </a>
              <span className="text-gray-600">·</span>
              <a
                href="https://www.instagram.com/your-handle"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-yellow hover:underline"
              >
                Instagram
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
