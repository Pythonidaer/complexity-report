# Phase 8: Publish to npm - Checklist

## ✅ Pre-publish Verification Complete

### Package Validation
- ✅ **files array**: Correctly includes only necessary files
- ✅ **Repository URLs**: Updated to https://github.com/Pythonidaer/complexity-report.git
- ✅ **Package size**: 70.3 KB (reasonable)
- ✅ **File count**: 57 files (all source, no tests/docs)
- ✅ **Dry run**: `npm pack --dry-run` successful

### What's Published
✅ Source code (all modules)
✅ Assets (prettify, CSS, sprites)
✅ README.md, CHANGELOG.md, LICENSE
✅ package.json with correct metadata

### What's NOT Published
❌ `__tests__/` - Test files
❌ `docs/` - Developer documentation
❌ `tools/` - Debug utilities
❌ `coverage/` - Test coverage
❌ `complexity/` - Generated reports
❌ Dev configs (eslint, vitest, git)

## Publishing Steps

### 1. Commit and Push to GitHub

```bash
# Add all files
git add .

# Commit
git commit -m "chore: prepare v1.0.0 for npm release

- Add comprehensive README for npm
- Add CHANGELOG with migration guide
- Configure package.json with correct metadata
- Clean public API with TypeScript types
- 287 tests passing with 90% coverage
- Complete Phases 2-6 of npm migration"

# Push to main
git push origin main
```

### 2. Create Git Tag

```bash
# Create annotated tag
git tag -a v1.0.0 -m "Release v1.0.0 - Initial npm package release"

# Push tag
git push origin v1.0.0
```

### 3. Login to npm (if needed)

```bash
npm login
```

### 4. Publish to npm

```bash
# Public package
npm publish

# OR if scoped: npm publish --access public
```

### 5. Verify Publication

```bash
# Check on npm
open https://www.npmjs.com/package/complexity-report

# Test installation
npm install -g complexity-report
complexity-report --help
```

## Post-publish Tasks

### 1. Update README badges
Once published, the npm version badge will work:
```markdown
[![npm version](https://img.shields.io/npm/v/complexity-report.svg)](https://www.npmjs.com/package/complexity-report)
```

### 2. Create GitHub Release
- Go to https://github.com/Pythonidaer/complexity-report/releases
- Click "Create a new release"
- Choose tag: v1.0.0
- Title: "v1.0.0 - Initial Release"
- Description: Copy from CHANGELOG.md

### 3. Test in Real Project
```bash
cd /path/to/new-years-project
npm install complexity-report
npx complexity-report
```

## Troubleshooting

### "You do not have permission to publish"
- Run `npm login` to authenticate
- Verify username with `npm whoami`
- Check package name isn't taken: `npm view complexity-report`

### "Package name too similar"
- If name is taken, consider scoped package: `@pythonidaer/complexity-report`
- Update `name` in package.json
- Publish with `npm publish --access public`

### "Version already exists"
- Can't republish same version
- Bump version: `npm version patch` (1.0.1)
- Or: `npm version minor` (1.1.0)

## Quick Commands Reference

```bash
# Check what will be published
npm pack --dry-run

# Check package size
npm pack
ls -lh complexity-report-1.0.0.tgz

# Publish
npm publish

# Check published package
npm view complexity-report

# Install your package
npm install complexity-report
```

## Ready to Publish?

Your package is ready! Once you:
1. ✅ Commit and push to GitHub
2. ✅ Create v1.0.0 tag
3. ✅ Run `npm publish`

The package will be live at: https://www.npmjs.com/package/complexity-report
