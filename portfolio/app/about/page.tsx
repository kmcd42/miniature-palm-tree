import Image from 'next/image'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About | Kasey McDonnell',
  description: 'Learn more about Kasey McDonnell - designer, writer, photographer, and marketer.',
}

export default function AboutPage() {
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
              <p>
                I am a designer, writer, and marketer who excels at delivering engaging and audience-focused creative.
              </p>

              <p>
                For seven years, I have achieved results through high quality design and copy in agency and government settings.
              </p>

              <p className="font-semibold">
                My specialty is combining audience-based strategic thinking with any kind of design.
              </p>

              <p>
                I'm a keen writer, photographer, videographer, motion designer, and graphic designer. I find the best way to tell a story, then use my skills to tell it well.
              </p>

              <p>
                When I'm not designing your next project, I'm writing my climate newsletter:{' '}
                <a
                  href="https://threesixtysix.substack.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-yellow hover:underline"
                >
                  threesixtysix
                </a>
                . It's a great way for anyone to understand climate change and why it matters.
              </p>
            </div>

            <div className="mt-12 space-y-4">
              <h2 className="text-2xl font-serif font-bold mb-4">Skills</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  'Visual Design',
                  'Photography',
                  'Videography',
                  'Motion Design',
                  'Copywriting',
                  'Strategic Thinking',
                  'Audience Research',
                  'Project Management',
                ].map((skill) => (
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
          {/* Add your actual experience here */}
          <div className="border-l-2 border-brand-yellow pl-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-2xl font-serif font-bold">Your Role</h3>
              <span className="text-gray-400">2020 - Present</span>
            </div>
            <p className="text-brand-yellow mb-3">Company Name</p>
            <p className="text-gray-300">
              Description of your role and achievements. Replace this with your actual work experience.
            </p>
          </div>

          <div className="border-l-2 border-white/20 pl-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-2xl font-serif font-bold">Previous Role</h3>
              <span className="text-gray-400">2018 - 2020</span>
            </div>
            <p className="text-brand-yellow mb-3">Previous Company</p>
            <p className="text-gray-300">
              Description of your previous role and achievements.
            </p>
          </div>
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
