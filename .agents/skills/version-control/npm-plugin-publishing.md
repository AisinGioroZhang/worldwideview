---
name: npm-plugin-publishing
description: Automated plugin publishing workflow for monorepo packages. Use when releasing a plugin to NPM via GitHub Actions.
---

# NPM Plugin Publishing Rules

## Day-to-Day Release Command

```bash
# Bug fix in a plugin
npm version patch -w packages/plugin-aviation
git push && git push --tags

# New feature in a plugin
npm version minor -w packages/plugin-maritime
git push && git push --tags
```

This creates a scoped tag like `plugin-aviation-v1.0.1` which triggers the GitHub Action.

**Never run `npm publish` manually** — tags trigger CI/CD automatically.

---

## Automated Flow

```
Code changes → commit & push to main
  → npm version patch -w packages/<plugin>
  → git push --tags
  → GitHub Action triggers on tag pattern: plugin-*-v*
  → Builds package → publishes to NPM 🎉
```

---

## GitHub Action (`publish.yml`)

```yaml
name: Publish Plugin to NPM
on:
  push:
    tags:
      - "plugin-*-v*"
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: "https://registry.npmjs.org"
      - run: npm ci
      - name: Detect package
        id: pkg
        run: |
          TAG="${{ github.ref_name }}"
          PKG=$(echo "$TAG" | sed 's/-v[0-9].*//')
          echo "package=$PKG" >> $GITHUB_OUTPUT
      - run: npm run build -w packages/${{ steps.pkg.outputs.package }}
      - run: npm publish packages/${{ steps.pkg.outputs.package }} --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

---

## One-Time Setup

1. **NPM Token** — npmjs.com → Access Tokens → Generate (Automation type)
2. **GitHub Secret** — Repo → Settings → Secrets → Actions → `NPM_TOKEN`
3. **NPM Org** — Create `@worldwideview` org on npmjs.com for scoped packages
