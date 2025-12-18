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
- 📝 About/CV page with contact section
- 📬 Simple contact page with bot-protected email
- 🐳 Docker containerization for easy deployment
- 📱 Fully responsive design
- ⚡ Optimized images with Next.js Image component
- 🚀 No server-side requirements (fully static)

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

## Complete Setup Guide for Mac

**Start here if you're new to running code locally.** This guide assumes nothing and walks through every step.

### Step 1: Install Prerequisites

First, you need Node.js (which includes npm) to run the website.

1. **Check if you have Node.js already:**
   - Open **Terminal** (Applications → Utilities → Terminal)
   - Type this and press Enter:
     ```bash
     node --version
     ```
   - If you see a version number (like `v20.x.x`), you're good! Skip to Step 2.
   - If you see `command not found`, continue below.

2. **Install Node.js:**
   - Go to https://nodejs.org
   - Download the **LTS version** (recommended for most users)
   - Open the downloaded file and follow the installer
   - Restart Terminal after installation
   - Verify it worked by running `node --version` again

### Step 2: Get the Code on Your Mac

1. **Clone the repository:**
   - In Terminal, navigate to where you want the code (e.g., your Documents folder):
     ```bash
     cd ~/Documents
     ```
   - Clone the repository:
     ```bash
     git clone https://github.com/kmcd42/miniature-palm-tree.git
     ```
   - You should see "Cloning into 'miniature-palm-tree'..."

2. **Navigate to the portfolio folder:**
   ```bash
   cd miniature-palm-tree/portfolio
   ```
   - This takes you inside the project where all the website code lives

### Step 3: Install Dependencies

The website needs some additional packages to run. Install them:

```bash
npm install
```

This will take a minute or two. You'll see a progress bar and lots of text scrolling by. When it finishes, you'll see something like "added X packages".

### Step 4: Run the Website Locally

Start the development server:

```bash
npm run dev
```

You should see:
```
▲ Next.js 16.0.10
- Local:        http://localhost:3000
```

**The website is now running on your Mac!**

### Step 5: View the Website

1. Open your web browser (Chrome, Safari, Firefox, etc.)
2. Go to: **http://localhost:3000**
3. You should see your portfolio website!

### Step 6: Stop the Server

When you're done:
- Go back to Terminal
- Press **Control + C** (⌃C) to stop the server

### Quick Reference: Running Again Later

After the initial setup, here's all you need to do:

1. Open Terminal
2. Navigate to the portfolio folder:
   ```bash
   cd ~/Documents/miniature-palm-tree/portfolio
   ```
3. Start the server:
   ```bash
   npm run dev
   ```
4. Open http://localhost:3000 in your browser
5. Press Control+C to stop when done

### Common Issues & Troubleshooting

**Problem: "command not found: git"**
- Solution: Install Git from https://git-scm.com/download/mac
- Or install via Homebrew: `brew install git` (if you have Homebrew)

**Problem: "npm install" fails or hangs**
- Solution 1: Make sure you're in the `portfolio` folder: `pwd` should show `.../miniature-palm-tree/portfolio`
- Solution 2: Try deleting `node_modules` folder and running `npm install` again:
  ```bash
  rm -rf node_modules
  npm install
  ```

**Problem: "Port 3000 is already in use"**
- Solution: Something else is running on port 3000. Kill it:
  ```bash
  lsof -ti:3000 | xargs kill
  ```
- Or just use a different port:
  ```bash
  PORT=3001 npm run dev
  ```
  Then open http://localhost:3001

**Problem: Changes don't show up in browser**
- Solution 1: Hard refresh the browser (Command+Shift+R on Mac)
- Solution 2: Stop the server (Control+C) and start again (`npm run dev`)
- Solution 3: Clear browser cache

**Problem: Lost or forgot where the folder is**
- Find it: Open Finder, press Command+F, search for "miniature-palm-tree"
- Or in Terminal: `find ~ -name "miniature-palm-tree" -type d 2>/dev/null`

**Problem: Terminal says "permission denied"**
- You might need to run with sudo (careful with this):
  ```bash
  sudo npm install
  ```
- Better solution: Fix npm permissions following https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally

---

## Content Management with Decap CMS

### Using the Visual Admin Interface

**The easiest way to edit your content!** No need to edit JSON files or code.

#### Step 1: Start Everything with Docker (Easiest!)

**Single command runs both the website AND CMS:**

```bash
cd /Users/kaseymcdonnell/portfolio/miniature-palm-tree/portfolio
docker compose up
```

Wait for:
- ✅ "ready - started server on 0.0.0.0:3000"
- ✅ "Decap CMS Proxy Server listening on port 8081"

**To run in background:**
```bash
docker compose up -d
```

**To stop:**
```bash
docker compose down
```

#### Alternative: Run Without Docker

If you prefer running directly (two Terminal windows needed):

**Terminal 1 - Run the website:**
```bash
cd ~/Documents/miniature-palm-tree/portfolio
npm run dev
```

**Terminal 2 - Run the CMS backend:**
```bash
cd ~/Documents/miniature-palm-tree/portfolio
npm run cms
```

#### Step 2: Access the Admin Panel

1. Open your browser
2. Go to: **http://localhost:3000/admin**
3. You'll see the Decap CMS login screen
4. Click **"Login"** (no password needed for local development)

#### Step 3: Edit Your Content

You'll see a beautiful admin interface where you can:

- **Site Settings** - Update your email, social links, tagline
- **Home Page** - Change your greeting and introduction
- **About** - Edit your bio, skills, and work experience
- **Projects** - Add/edit/delete projects with images
- **Photography** - Manage photography collections

**Changes are automatically:**
- ✅ Saved to your JSON files
- ✅ Committed to Git
- ✅ Visible on your website immediately

#### Step 4: Upload Images

- Click any image field in the admin
- Upload new photos directly
- They're automatically saved to the correct folder
- No need to worry about file names or paths

### Manual Editing (Alternative)

If you prefer editing files directly:

#### Adding Images Manually

1. In Finder, navigate to the portfolio folder
2. Go to `public/images/`
3. Replace the placeholder images with your photos (keep the same names)
4. See `public/images/README.md` for the complete list of required images

#### Editing Content Manually

1. Open the project in a text editor (VS Code recommended, free from https://code.visualstudio.com)
2. Edit `data/content.json` to update your bio, projects, etc.
3. Save the file
4. The website will automatically refresh in your browser (if dev server is running)

#### Updating Social Links Manually

Edit these files to add your real social media URLs:
- `app/contact/page.tsx` - lines 53 and 62
- `app/about/page.tsx` - lines 135 and 144
- `components/Navigation.tsx` - lines 48 and 55

---

## Docker Deployment (Advanced)

If you want to run the site in a Docker container instead:

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

## Contact

The contact page uses a simple bot-protected email button that:
- Splits the email address into parts (simple bot protection)
- Opens mailto: link on click
- No server-side requirements

Contact information also appears on the About page for easy access. Update your email and social links in:
- `app/contact/page.tsx` - Contact page email button
- `app/about/page.tsx` - About page contact section
- `components/Navigation.tsx` - Header navigation links

## License

ISC

## Author

Kasey McDonnell
