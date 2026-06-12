# Personal Blog

A simple static personal blog built with React and Markdown. It does not use Jekyll or any site generator.

## Edit the Site

- Update the site title and intro copy in `script.js`.
- Add new Markdown posts in `content/posts/`.
- Include front matter at the top of each post:

  ```md
  ---
  title: My New Post
  createdAt: 2026-06-10
  date: June 10, 2026
  category: Notes
  ---
  ```

- Set `createdAt` as `YYYY-MM-DD`; posts are discovered automatically and listed newest first.

## Add Images

Images do not need to be SVG. You can use normal `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, or `.svg` files.

1. Put image files in `images/`.
2. Reference them from Markdown posts like this:

   ```md
   ![Image description](../../images/example.png)
   ```

The `../../images/` path works in Markdown preview from `content/posts/`, and the site automatically normalizes it when rendering.

## Preview Locally

Run a small static server:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

Markdown loading uses `fetch()`, so opening `index.html` directly with `file://` may be blocked by browser security. GitHub Pages and the local server both work.

Local preview discovers posts from the directory listing served by `python3 -m http.server`. On GitHub Pages, posts are discovered from the public repository through GitHub's contents API.

## Publish to GitHub Pages

This project includes a GitHub Actions workflow at `.github/workflows/pages.yml`.
Every push to `main` deploys the site automatically.

1. Create a new GitHub repository.
2. Add it as this repo's remote:

   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   ```

3. Deploy:

   ```bash
   ./scripts/deploy.sh "Initial blog deploy"
   ```

4. In GitHub, open the repository settings and go to **Pages**.
5. Set **Source** to **GitHub Actions**.
6. The included workflow will deploy the site after each push to `main`.

Your site will be available at:

```text
https://YOUR-USERNAME.github.io/YOUR-REPO/
```

See `DEPLOYMENT.md` for the full deployment guide.
