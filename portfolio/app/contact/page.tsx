'use client'

import { Mail, Linkedin, Instagram } from 'lucide-react'
import { Metadata } from 'next'
import { useState } from 'react'

export default function ContactPage() {
  const [emailRevealed, setEmailRevealed] = useState(false)

  // Simple bot protection: email parts are combined on click
  const emailUser = 'hello'
  const emailDomain = 'kaseymcdonnell.co.nz'
  const fullEmail = `${emailUser}@${emailDomain}`

  const handleEmailClick = () => {
    setEmailRevealed(true)
    window.location.href = `mailto:${fullEmail}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <section className="container mx-auto px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-brand-yellow mb-8">
            Get in touch
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-16">
            I'm always interested in new projects and collaborations.
          </p>

          {/* Email Button */}
          <div className="mb-16">
            <button
              onClick={handleEmailClick}
              className="group inline-flex items-center gap-3 px-8 py-4 bg-brand-yellow text-brand-dark font-sans font-semibold text-lg rounded-full hover:bg-yellow-300 transition-all transform hover:scale-105"
            >
              <Mail className="w-5 h-5" />
              {emailRevealed ? fullEmail : 'Email Me'}
            </button>
            {!emailRevealed && (
              <p className="mt-4 text-sm text-gray-400">
                Click to reveal email address
              </p>
            )}
          </div>

          {/* Social Links */}
          <div className="border-t border-white/10 pt-12">
            <h2 className="text-2xl font-serif font-bold mb-8">Connect on social</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <a
                href="https://www.linkedin.com/in/your-profile"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-6 py-3 border-2 border-white/20 rounded-full hover:border-brand-yellow transition-colors"
              >
                <Linkedin className="w-5 h-5 group-hover:text-brand-yellow transition-colors" />
                <span className="group-hover:text-brand-yellow transition-colors">LinkedIn</span>
              </a>
              <a
                href="https://www.instagram.com/your-handle"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 px-6 py-3 border-2 border-white/20 rounded-full hover:border-brand-yellow transition-colors"
              >
                <Instagram className="w-5 h-5 group-hover:text-brand-yellow transition-colors" />
                <span className="group-hover:text-brand-yellow transition-colors">Instagram</span>
              </a>
            </div>
          </div>

          {/* Alternative text link */}
          <div className="mt-16 text-gray-400">
            <p className="mb-4">Or send an email directly to:</p>
            <button
              onClick={handleEmailClick}
              className="text-brand-yellow hover:underline font-mono text-sm"
            >
              {emailRevealed ? fullEmail : `${emailUser} [at] ${emailDomain}`}
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
