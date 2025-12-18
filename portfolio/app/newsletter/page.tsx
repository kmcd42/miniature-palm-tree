import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Newsletter | Kasey McDonnell',
  description: 'Subscribe to threesixtysix - a climate newsletter that helps you understand climate change.',
}

export default function NewsletterPage() {
  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="hero-title mb-8">threesixtysix</h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-12">
            A climate newsletter that helps you understand climate change and why it matters.
          </p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 mb-8">
            <h2 className="text-2xl font-serif font-bold mb-6">
              Subscribe to the newsletter
            </h2>

            <p className="text-gray-300 mb-8">
              Get weekly insights on climate change, sustainability, and environmental action delivered straight to your inbox.
            </p>

            {/* Substack embed would go here */}
            <a
              href="https://threesixtysix.substack.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-8 py-4 bg-brand-yellow text-brand-dark font-sans font-semibold rounded-full hover:bg-yellow-300 transition-colors"
            >
              Subscribe on Substack →
            </a>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div>
              <h3 className="text-4xl font-serif font-bold text-brand-yellow mb-2">
                365
              </h3>
              <p className="text-gray-400">
                Days of climate coverage
              </p>
            </div>
            <div>
              <h3 className="text-4xl font-serif font-bold text-brand-yellow mb-2">
                Weekly
              </h3>
              <p className="text-gray-400">
                New issues published
              </p>
            </div>
            <div>
              <h3 className="text-4xl font-serif font-bold text-brand-yellow mb-2">
                Free
              </h3>
              <p className="text-gray-400">
                Always accessible
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
