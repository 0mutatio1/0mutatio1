# Deployment

This blog deploys automatically to GitHub Pages with GitHub Actions.

## One-Time Setup

1. Create a new GitHub repository.
2. Add the repository as this project's `origin` remote:

   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   ```

3. Make the first deployment:

   ```bash
   ./scripts/deploy.sh "Initial blog deploy"
   ```

4. In GitHub, open the repository.
5. Go to **Settings** → **Pages**.
6. Set **Source** to **GitHub Actions**.

After that, every push to `main` deploys automatically.

## Daily Deployment

After editing posts, styles, or code:

```bash
./scripts/deploy.sh "Update blog"
```

The script will:

- Stage changed files
- Create a commit if needed
- Push `main` to GitHub
- Trigger the GitHub Pages workflow

## Site URL

For a normal project repository, the site URL will be:

```text
https://YOUR-USERNAME.github.io/YOUR-REPO/
```

For a user site repository named `YOUR-USERNAME.github.io`, the URL will be:

```text
https://YOUR-USERNAME.github.io/
```

## Notes

- Keep `.nojekyll`; this site is plain static React and Markdown, not a Jekyll site.
- Markdown posts are discovered automatically from `content/posts/`.
- Images should go in `images/` and be referenced from posts with `../../images/example.png`.
