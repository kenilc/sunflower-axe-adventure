# Sunflower • Axe & Adventure

Recovered from the successfully deployed Sites version 6.

- Original deployment: https://sunflower-axe-adventure.kenilc.chatgpt.site
- Original source commit: `34f743aaf91b99a6055378da8958e7470424631e`
- GitHub repository: https://github.com/kenilc/sunflower-axe-adventure
- Expected GitHub Pages URL: https://kenilc.github.io/sunflower-axe-adventure/

The recovered game lives in `dist/`, including its bundled Three.js module. No build or package installation is required. All six game files are unchanged from the deployed source.

## Publish

Enable **Settings → Pages → Build and deployment → Source → GitHub Actions** in the repository.

Push this checkout to the repository with an authenticated Git client:

```sh
git remote add github https://github.com/kenilc/sunflower-axe-adventure.git
git push github main
```

The included Pages workflow publishes `dist/` on pushes to `main` and can also be run manually from Actions. Relative asset paths support the repository's Pages subdirectory.

## Local preview

Serve `dist/` with a local HTTP server and open its URL. ES modules require HTTP rather than opening `index.html` directly from disk.
