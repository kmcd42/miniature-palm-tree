'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Instagram, Linkedin } from 'lucide-react'

export default function Navigation() {
  const pathname = usePathname()

  const navLinks = [
    { href: '/about', label: 'about' },
    { href: '/portfolio', label: 'portfolio' },
    { href: '/photography', label: 'photography' },
    { href: '/newsletter', label: 'newsletter' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/95 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left nav */}
          <div className="flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-sans transition-colors hover:text-brand-yellow ${
                  pathname === link.href ? 'text-brand-yellow' : 'text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Center logo */}
          <Link
            href="/"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <div className="w-10 h-10 bg-brand-yellow rounded-sm flex items-center justify-center">
              <span className="text-brand-dark font-serif font-bold text-xl">k.</span>
            </div>
          </Link>

          {/* Right nav */}
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-brand-yellow transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={20} />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-brand-yellow transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin size={20} />
            </a>
            <Link
              href="/contact"
              className="ml-4 px-6 py-2 bg-brand-yellow text-brand-dark font-sans text-sm rounded-full hover:bg-yellow-300 transition-colors"
            >
              contact
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}
