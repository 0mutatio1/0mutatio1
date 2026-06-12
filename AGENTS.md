# Agent Instructions

## Project Overview

This is a simple static personal blog for GitHub Pages.

- Use React from CDN in `index.html`.
- Use plain Markdown files for posts in `content/posts/`.
- Do not add Jekyll, Next.js, Vite, Gatsby, Astro, npm tooling, or another build framework unless the user explicitly asks.
- Keep the site deployable as static files.

## Current Structure

- `index.html`: Mounts the React app and loads React/ReactDOM from CDN.
- `script.js`: Contains the React app, automatic post discovery, Markdown loading, and lightweight Markdown rendering.
- `styles.css`: Contains all styling.
- `content/posts/*.md`: Blog article source files.
- `.github/workflows/pages.yml`: GitHub Pages deployment workflow.
- `scripts/deploy.sh`: Helper script that commits and pushes to trigger deployment.
- `DEPLOYMENT.md`: Deployment guide.
- `.nojekyll`: Prevents GitHub Pages from processing the site with Jekyll.
- `README.md`: User-facing setup, editing, preview, and publish instructions.

## Editing Posts

When adding a post:

1. Add a Markdown file under `content/posts/`.
2. Add front matter at the top of the file:

   ```md
   ---
   title: My New Post
   createdAt: 2026-06-10
   date: June 10, 2026
   category: Notes
   ---
   ```

Do not add posts to `script.js`; the app discovers Markdown files automatically.

Use ISO `YYYY-MM-DD` values for `createdAt`; the article list sorts by `createdAt` descending. Local discovery uses the directory listing from `python3 -m http.server`; GitHub Pages discovery uses the public GitHub contents API.

## Images

Images can be `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, or `.svg`; SVG is not required.

Recommended workflow:

1. Put image files in `images/`.
2. Reference images from Markdown posts with paths relative to the Markdown file:

   ```md
   ![Image description](../../images/example.png)
   ```

The site renderer normalizes `../../images/...` to `images/...`, so images work both in Markdown preview tools and in the deployed site.

The built-in Markdown renderer intentionally supports only a small subset:

- `# Heading`
- `## Heading`
- Paragraphs
- `**bold**`
- `*italic*`
- `` `inline code` ``

If richer Markdown is needed, prefer extending the local renderer conservatively before adding dependencies.

## Design Direction

Keep the design clean and simple:

- Top title/header.
- Article list on the left.
- Article content on the right.
- On mobile, stack the list above the content.
- Avoid hero sections, marketing layouts, decorative images, heavy cards, gradients, and extra controls unless requested.

## Local Preview

Use a local static server because Markdown loading uses `fetch()` and may not work from `file://`.

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/index.html
```

## Verification

After changes, verify:

- React renders the `.reader-layout`.
- Markdown content loads from `content/posts/`.
- Clicking an article title updates the right pane.
- Search filters the article list.
- There is no horizontal overflow on mobile.
- Browser console has no errors.

## Deployment

Do not add a build step unless requested. Deployment is static:

```bash
./scripts/deploy.sh "Update blog"
```

The helper stages files, creates a commit if needed, and pushes `main` to GitHub. The existing GitHub Actions workflow deploys on push to `main`.

## Cleanup Rules

- Do not keep unused generated images, empty legacy folders, or `.DS_Store`.
- Keep `.nojekyll` for GitHub Pages.
- Keep `.gitignore` covering `.DS_Store`.
