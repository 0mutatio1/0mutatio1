#!/usr/bin/env bash
set -euo pipefail

commit_message="${1:-Update blog}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "This script must be run inside a Git repository."
  exit 1
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "No GitHub remote named 'origin' is configured."
  echo "Add one first:"
  echo "  git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git"
  exit 1
fi

current_branch="$(git branch --show-current)"
if [ "$current_branch" != "main" ]; then
  echo "You are on branch '$current_branch'. Switch to main before deploying:"
  echo "  git switch main"
  exit 1
fi

git add .

if git diff --cached --quiet; then
  echo "No changes to commit."
else
  git commit -m "$commit_message"
fi

git push -u origin main

echo
echo "Pushed to GitHub. GitHub Actions will deploy the site automatically."
echo "Check the Actions tab in your repository for deployment status."
