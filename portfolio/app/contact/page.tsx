'use client'

import { useState } from 'react'
import { Metadata } from 'next'
import Image from 'next/image'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    budget: '',
    message: '',
  })

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('submitting')

    // TODO: Implement actual form submission
    // For now, just simulate success
    setTimeout(() => {
      setStatus('success')
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        budget: '',
        message: '',
      })
    }, 1000)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="min-h-screen">
      <section className="container mx-auto px-6 py-20">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left: Form */}
          <div>
            <h1 className="text-5xl md:text-6xl font-serif font-bold text-brand-yellow mb-8">
              Get in touch
            </h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm mb-2">
                    First Name <span className="text-brand-yellow">*</span>
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg focus:border-brand-yellow focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm mb-2">
                    Last Name <span className="text-brand-yellow">*</span>
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg focus:border-brand-yellow focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm mb-2">
                  Email <span className="text-brand-yellow">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg focus:border-brand-yellow focus:outline-none transition-colors"
                />
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg focus:border-brand-yellow focus:outline-none transition-colors"
                />
              </div>

              {/* Budget */}
              <div>
                <label htmlFor="budget" className="block text-sm mb-2">
                  What is your budget?
                </label>
                <input
                  type="text"
                  id="budget"
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg focus:border-brand-yellow focus:outline-none transition-colors"
                />
              </div>

              {/* Message */}
              <div>
                <label htmlFor="message" className="block text-sm mb-2">
                  Message <span className="text-brand-yellow">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg focus:border-brand-yellow focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="w-full px-8 py-4 bg-brand-yellow text-brand-dark font-sans font-semibold rounded-full hover:bg-yellow-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'submitting' ? 'Sending...' : 'Send Message'}
              </button>

              {/* Status Messages */}
              {status === 'success' && (
                <p className="text-green-400 text-center">
                  Thank you! Your message has been sent successfully.
                </p>
              )}
              {status === 'error' && (
                <p className="text-red-400 text-center">
                  Sorry, there was an error sending your message. Please try again.
                </p>
              )}
            </form>
          </div>

          {/* Right: Images */}
          <div className="hidden lg:flex flex-col gap-4">
            <div className="relative aspect-[4/3] rounded-lg overflow-hidden">
              <Image
                src="/images/contact-1.jpg"
                alt="Contact image 1"
                fill
                className="object-cover"
                sizes="50vw"
              />
            </div>
            <div className="relative aspect-square rounded-lg overflow-hidden">
              <Image
                src="/images/contact-2.jpg"
                alt="Contact image 2"
                fill
                className="object-cover"
                sizes="50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Additional Contact Info */}
      <section className="container mx-auto px-6 py-20 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold mb-6">Let's connect</h2>
          <p className="text-lg text-gray-300 mb-8">
            I'm always interested in new projects and collaborations. Feel free to reach out through the form or connect with me on social media.
          </p>
          <div className="flex justify-center gap-6">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-yellow hover:underline"
            >
              Instagram
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-yellow hover:underline"
            >
              LinkedIn
            </a>
            <a
              href="mailto:hello@kaseymcdonnell.co.nz"
              className="text-brand-yellow hover:underline"
            >
              Email
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
