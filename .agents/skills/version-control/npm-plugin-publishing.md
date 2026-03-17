---
name: npm-plugin-publishing
description: How to manage, version, publish, and operate the WorldWideView npm workspace packages. Covers monorepo structure, daily development, releasing, OIDC trusted publishing, and troubleshooting.
---

# NPM Plugin Package Management

## Monorepo Structure

```
packages/
├── wwv-plugin-sdk/           ← compiled types (dist/) — the public API
├── wwv-plugin-aviation/      ← TypeScript source — published as src/
├── wwv-plugin-maritime/
├── wwv-plugin-wildfire/
├── wwv-plugin-borders/
├── wwv-plugin-camera/        ← 8 source files (5 components + frustum)
└── wwv-plugin-military/
```

- **Scope:** `@worldwideview`
- **Naming convention:** `wwv-plugin-<name>` (enforced for discovery)
- **npm org:** `worldwideview` on npmjs.com
- **Owner:** `silvertakana`

---

## Package Registry URLs

| Package | npm URL |
|---|---|
| SDK | https://www.npmjs.com/package/@worldwideview/wwv-plugin-sdk |
| Aviation | https://www.npmjs.com/package/@worldwideview/wwv-plugin-aviation |
| Maritime | https://www.npmjs.com/package/@worldwideview/wwv-plugin-maritime |
| Wildfire | https://www.npmjs.com/package/@worldwideview/wwv-plugin-wildfire |
| Borders | https://www.npmjs.com/package/@worldwideview/wwv-plugin-borders |
| Camera | https://www.npmjs.com/package/@worldwideview/wwv-plugin-camera |
| Military | https://www.npmjs.com/package/@worldwideview/wwv-plugin-military |

---

## Daily Development

Plugins are workspace packages, so `npm install` creates symlinks automatically:

```bash
cd c:\dev\worldwideview
npm install  # resolves all workspace symlinks
```

Changes to any plugin in `packages/*/src/` are immediately reflected in the
main app — no build or reinstall step needed during development.

---

## Releasing a Plugin

### Bug fix (patch)

```bash
npm version patch -w packages/wwv-plugin-aviation
git push && git push --tags
```

### New feature (minor)

```bash
npm version minor -w packages/wwv-plugin-maritime
git push && git push --tags
```

### Breaking change (major)

```bash
npm version major -w packages/wwv-plugin-sdk
git push && git push --tags
```

This creates a Git tag like `wwv-plugin-aviation-v1.0.1` which triggers
the GitHub Action at `.github/workflows/publish-plugin.yml`.

---

## CI/CD Publishing Flow

```
Code changes → commit & push
  → npm version <patch|minor|major> -w packages/<plugin>
  → git push --tags
  → GitHub Action triggered by tag: wwv-plugin-*-v*
  → OIDC auth → publish to npm (no stored token needed)
```

### GitHub Action (`.github/workflows/publish-plugin.yml`)

Uses **OIDC Trusted Publishing** — no `NPM_TOKEN` secret required.
Each package must have a Trusted Publisher configured in npm settings.

```yaml
permissions:
  contents: read
  id-token: write  # OIDC
```

Publishes with `--provenance` flag for supply chain attestation.

---

## Trusted Publishing Setup (per-package, one-time)

1. Go to `https://www.npmjs.com/package/@worldwideview/wwv-plugin-<name>/access`
2. Find **Trusted Publisher** section
3. Click **GitHub Actions** button
4. Fill in:
   - Repository owner: `silvertakana`
   - Repository name: `worldwideview`
   - Workflow: `.github/workflows/publish-plugin.yml`

Repeat for each package. Only needs to be done once per package.

---

## Manual Publishing (emergency / first-time)

Only needed if OIDC is not configured or for the very first publish:

```bash
# Must be logged in: npm login
# Requires 2FA or a granular token with "bypass 2FA" checked
npm publish --workspace=packages/wwv-plugin-sdk --access public
```

---

## Key Files

| File | Purpose |
|---|---|
| `package.json` (root) | `workspaces: ["packages/*"]` + all plugin deps |
| `tsconfig.json` (root) | `@worldwideview/*` path aliases |
| `packages/*/package.json` | Per-package name, version, files, peerDeps |
| `packages/*/tsconfig.json` | Extends root tsconfig (dev-time type checking) |
| `.github/workflows/publish-plugin.yml` | Automated OIDC publish on tag push |

---

## Troubleshooting

**"Cannot find module '@worldwideview/...'"**
→ Run `npm install` to restore workspace symlinks

**"403 Two-factor authentication required"**
→ Use `--otp=<code>` or create a granular token with "Bypass 2FA" checked

**"404 Not Found" on publish**
→ The `@worldwideview` npm org must exist and your account must be a member

**IDE shows "Cannot find module ./CameraDetail"**
→ Stale TypeScript server cache. Restart TS server or IDE.

**Tests reference old `src/plugins/` paths**
→ All plugins now live under `packages/`. The `src/plugins/geojson/` is the
only plugin that stays in-app (it's an app feature, not a publishable plugin).
