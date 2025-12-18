# Kasey McDonnell Portfolio

A modern, containerized portfolio website built with Next.js, featuring photography galleries, project showcase, and contact capabilities.

## Tech Stack

- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Docker** - Containerized deployment
- **Playfair Display & Inter** - Google Fonts for typography

## Features

- 🎨 Dark theme with yellow accent branding
- 📸 Photography gallery with collections
- 💼 Portfolio/project showcase
- 📝 About/CV page
- 📬 Contact form
- 🐳 Docker containerization for easy deployment
- 📱 Fully responsive design
- ⚡ Optimized images with Next.js Image component

## Project Structure

```
portfolio/
├── app/                    # Next.js App Router pages
│   ├── about/             # About page
│   ├── contact/           # Contact page
│   ├── newsletter/        # Newsletter page
│   ├── photography/       # Photography galleries
│   ├── portfolio/         # Portfolio/projects
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Homepage
│   └── globals.css        # Global styles
├── components/            # React components
│   └── Navigation.tsx     # Main navigation
├── data/                  # Content data (JSON)
│   └── content.json       # Site content
├── public/                # Static files
│   └── images/            # Image assets
├── Dockerfile             # Docker build configuration
├── docker-compose.yml     # Docker Compose setup
└── README.md             # This file
```

## Getting Started

### Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server:**
   ```bash
   npm run dev
   ```

3. **Open [http://localhost:3000](http://localhost:3000)**

### Adding Content

#### Update Site Content
Edit `data/content.json` to update:
- Site information
- About page bio and experience
- Projects
- Photography collections

#### Add Images
Place your images in `public/images/` following the structure in `public/images/README.md`:
- Homepage: `hero-image.jpg`, `project-1.jpg`, etc.
- About: `about-photo.jpg`
- Projects: `projects/project-name.jpg`
- Photography: `photography/collection-name/image.jpg`
- Contact: `contact-1.jpg`, `contact-2.jpg`

#### Update Social Links
Edit `components/Navigation.tsx` and `data/content.json` to update Instagram, LinkedIn, and email links.

## Docker Deployment

### Building and Running with Docker

1. **Build the Docker image:**
   ```bash
   docker build -t kasey-portfolio .
   ```

2. **Run the container:**
   ```bash
   docker run -p 3000:3000 kasey-portfolio
   ```

### Using Docker Compose (Recommended)

1. **Start the container:**
   ```bash
   docker compose up -d
   ```

2. **Stop the container:**
   ```bash
   docker compose down
   ```

3. **View logs:**
   ```bash
   docker compose logs -f
   ```

4. **Rebuild and restart:**
   ```bash
   docker compose up -d --build
   ```

## Deploying to Mac Mini

### Prerequisites
- Docker installed on Mac Mini
- Git installed

### Deployment Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/kmcd42/miniature-palm-tree.git
   cd miniature-palm-tree/portfolio
   ```

2. **Add your images:**
   - Copy your images to `public/images/` following the structure in `public/images/README.md`

3. **Update content:**
   - Edit `data/content.json` with your actual information
   - Update social media links in `components/Navigation.tsx`

4. **Build and start:**
   ```bash
   docker compose up -d --build
   ```

5. **Access the site:**
   - Local: `http://localhost:3000`
   - Network: `http://[your-mac-mini-ip]:3000`

### Setting Up Domain

To point `kaseymcdonnell.co.nz` to your Mac Mini:

1. **Update DNS records:**
   - Point A record to your Mac Mini's public IP
   - Or use a DDNS service if you have dynamic IP

2. **Set up reverse proxy (optional but recommended):**
   - Install nginx or Caddy for HTTPS
   - Configure to proxy to `localhost:3000`

3. **Example nginx configuration:**
   ```nginx
   server {
       listen 80;
       server_name kaseymcdonnell.co.nz;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

### Updating the Site

1. **Update content or images:**
   ```bash
   # Edit files
   docker compose down
   docker compose up -d --build
   ```

2. **Pull latest changes from git:**
   ```bash
   git pull
   docker compose up -d --build
   ```

## Customization

### Colors
Edit `tailwind.config.ts` to change brand colors:
```typescript
colors: {
  'brand-yellow': '#F4D03F',  // Change this
  'brand-dark': '#0a0a0a',    // And this
}
```

### Fonts
Edit `app/layout.tsx` to change fonts:
```typescript
import { YourFont, AnotherFont } from 'next/font/google'
```

### Content
All content is in `data/content.json` for easy updates without touching code.

## Production Build

```bash
npm run build
npm start
```

## Contact Form

The contact form currently shows a success message without actually sending emails. To implement email sending:

1. Add an API route: `app/api/contact/route.ts`
2. Integrate with email service (SendGrid, Mailgun, Resend, etc.)
3. Update `app/contact/page.tsx` to call the API

## License

ISC

## Author

Kasey McDonnell
