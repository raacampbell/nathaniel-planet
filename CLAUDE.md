# Nathaniel Planet: instructions for Claude

- After every feature or fix that works (checked in headless Chrome with no page errors), commit and push it to `main` straight away. Do not wait to be asked, and do not batch several features into one commit.
- Write a short commit message saying what changed. End it with the attribution lines the session asks for.
- Only commit work that has been checked. If a change is half-done or broken, leave it uncommitted and say so.
- The site is a GitHub Pages deployment of this repo. Pushing to `main` is what ships an update, and the in-app update button picks it up.
- When a fix resolves a GitHub issue, reference it in the commit message (e.g. "fixes #1"), and once the fix is pushed, close the issue with `gh issue close <n>` and a one-line comment saying what was fixed.
