# Insurance Insight CMS

A lightweight, high-performance, and SEO-friendly insurance blog website built with Vanilla JavaScript.

## Features
- **Data-Driven CMS**: Easily manage posts, categories, and authors via JSON files.
- **SPA Routing**: Fast, seamless page transitions without full page reloads.
- **Premium Design**: Modern editorial aesthetic with glassmorphism and crisp typography.
- **SEO Optimized**: Dynamic metadata updates, semantic HTML5, and breadcrumb support.
- **Mobile First**: Fully responsive design that looks great on all devices.
- **AdSense Ready**: Strategic ad placeholders throughout the article and sidebar layouts.

## Project Structure
- `/data/`: Contains JSON files for posts, categories, authors, and static pages.
- `/scripts/`: Main CMS logic (`cms.js`).
- `/styles/`: Premium CSS styles (`main.css`).
- `/index.html`: The main entry point and app shell.
- `netlify.toml`: Configuration for SPA routing on Netlify.

## How to Add a New Post
Simply open `data/posts.json` and add a new entry following this structure:
```json
{
  "id": "your-post-id",
  "title": "Your Article Title",
  "excerpt": "A short summary for the blog card...",
  "content": "### Header\nContent paragraph here...",
  "category": "category-id",
  "author": "author-id",
  "date": "2025-08-01",
  "image": "https://image-url.com",
  "featured": false
}
```

## Deployment
This site is ready for deployment to any static hosting service like Netlify, Vercel, or GitHub Pages.

**Note for Local Preview**: To see path-based URLs working correctly (e.g., `/post/abc`), you should use a local server that supports single-page application routing, or deploy to Netlify. For simple local testing, you can access the home page via the `index.html` file, but navigating to specific paths directly via the address bar may require a server rewrite.

## Technology Stack
- Vanilla HTML5
- Pure CSS3 (Custom Design System)
- Modern ES6+ JavaScript
- Google Fonts (Inter & Outfit)
