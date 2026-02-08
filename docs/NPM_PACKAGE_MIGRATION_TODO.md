# NPM Package Migration TODO — complexity-report

Checklist for moving the complexity report generator from this repo into a standalone repository and publishing it as an NPM package.

**Source repo:** `/Users/johnnyhammond/Documents/new-years-project` (scripts live in `scripts/`)  
**Target repo:** `/Users/johnnyhammond/Documents/complexity-report` (package root)

---

## Phase 1: Create target repo and copy code

- [ ] **Create the complexity-report repository** (if not already created)
  - Initialize at `/Users/johnnyhammond/Documents/complexity-report` (e.g. `git init` or clone from a new GitHub/GitLab repo).

- [ ] **Copy scripts directory contents into the new repo root**
  - Copy everything under `new-years-project/scripts/` into `complexity-report/` so that:
    - `scripts/report/index.js` → `complexity-report/report/index.js`
    - `scripts/decision-points/` → `complexity-report/decision-points/`
    - `scripts/function-boundaries/` → `complexity-report/function-boundaries/`
    - `scripts/function-extraction/` → `complexity-report/function-extraction/`
    - `scripts/html-generators/` → `complexity-report/html-generators/`
    - `scripts/export-generators/` → `complexity-report/export-generators/`
    - `scripts/integration/` → `complexity-report/integration/`
    - `scripts/assets/` → `complexity-report/assets/`
    - `scripts/docs/` → `complexity-report/docs/`
    - `scripts/__tests__/` → `complexity-report/__tests__/`
    - `scripts/tools/` → `complexity-report/tools/`
    - `scripts/complexity-breakdown.js` → `complexity-report/complexity-breakdown.js`
    - `scripts/function-hierarchy.js` → `complexity-report/function-hierarchy.js`
    - `scripts/README.md` → `complexity-report/README.md` (or merge into new root README)

- [ ] **Do not copy**
  - Root-level files that belong only to new-years-project (e.g. `vite.config.ts`, `src/`, root `package.json`).
  - Generated output: `new-years-project/complexity/` stays in the app repo; the package will write to a configurable output dir (e.g. `complexity/` under the consuming project’s cwd).

---

## Phase 2: Package structure in complexity-report ✅ COMPLETED

- [x] **Add `package.json` at complexity-report root**
  - `name`: e.g. `complexity-report` or scoped `@yourscope/complexity-report`
  - `version`: e.g. `1.0.0`
  - `type`: `"module"`
  - `main`: e.g. `report/index.js` or a new `index.js` that exports a programmatic API
  - `bin`: entry for CLI (e.g. `"complexity-report": "report/index.js"` or `report/cli.js`)
  - `engines`: e.g. `"node": ">=18"` (or whatever minimum you support)
  - `scripts`: `test` (vitest), `lint` (eslint), optional `run` or `report` that runs the generator
  - `files`: list of published paths (e.g. `report/`, `integration/`, `function-boundaries/`, `function-extraction/`, `decision-points/`, `html-generators/`, `export-generators/`, `assets/`, `complexity-breakdown.js`, `function-hierarchy.js`; exclude `__tests__/`, `docs/`, `tools/` unless you want to ship them)
  - `keywords`, `description`, `license`, `repository`, `homepage` as needed for npm

- [x] **Define entry points**
  - **CLI:** When the user runs `npx complexity-report` or `complexity-report`, it should run the current report pipeline with project root = `process.cwd()` (or `--cwd` if you add it).
  - **Programmatic (optional):** Export a single function, e.g. `generateReport(options)`, from `report/index.js` or a new `index.js`, so consumers can call it with `{ cwd, outputDir, exportDir, ... }`.

- [ ] **Stop relying on “parent of scripts” for project root**
  - In `report/index.js`, replace:
    - `const scriptsDir = resolve(__dirname, '..');`
    - `const projectRoot = resolve(scriptsDir, '..');`
  - With: project root = option (e.g. from CLI `--cwd` or API `options.cwd`) defaulting to `process.cwd()`.
  - Resolve paths to assets (prettify, CSS, etc.) relative to the **package root** (e.g. `import.meta.url` / `fileURLToPath` inside the package), not relative to a “scripts” folder.

- [x] **Resolve package-owned assets (prettify, CSS) relative to package root**
  - In `report/index.js`, `copyRequiredFiles` (and any similar logic) should resolve `assets/` and `html-generators/` relative to the complexity-report package root (e.g. `dirname` of the report entry file’s parent, or a known subpath of `import.meta.url`). After the move, “package root” is the repo root, so paths like `resolve(packageRoot, 'assets')` and `resolve(packageRoot, 'html-generators')` are correct.

---

## Phase 3: Dependencies and peer deps ✅ COMPLETED

- [x] **List runtime dependencies**
  - `eslint` — used in `integration/eslint/index.js` (ESLint API).
  - `@typescript-eslint/typescript-estree` — used in `function-extraction/ast-utils.js` and in `decision-points/` for parsing.
  - Add these to `dependencies` in `complexity-report/package.json` (or as `peerDependencies` if you want to allow the host’s ESLint/parser; document the supported range).

- [x] **Add devDependencies in complexity-report**
  - `vitest`, `eslint`, and any other dev tooling currently used by the scripts (mirror from new-years-project as needed).

- [x] **Remove or replace any imports from outside the scripts tree**
  - Ensure nothing in complexity-report imports from `new-years-project` (e.g. root `package.json` is only read at runtime from the **target project’s** root when running the report, not from the package’s own repo).

---

## Phase 4: Configuration and output paths ✅ COMPLETED

- [x] **Project root (cwd)**
  - CLI: default `process.cwd()`; optional `--cwd /path/to/project`.
  - Programmatic: accept `options.cwd` (default `process.cwd()`).

- [x] **Output directory**
  - Currently hardcoded as `projectRoot/complexity`. Consider making it configurable (e.g. `--output-dir` / `options.outputDir`), default `complexity` under cwd.

- [x] **Export directory**
  - Currently read from consuming project’s `package.json` → `complexityReport.exportDir` (e.g. `complexity/reports`). Keep this behavior: read `package.json` under `cwd` (the project being analyzed), not the package’s own `package.json`.

- [x] **ESLint config**
  - Keep resolving from project root: `findESLintConfig(projectRoot)` where `projectRoot` is the cwd (or `--cwd`). No changes to logic; only ensure `projectRoot` is the passed-in cwd.

---

## Phase 5: Tests ✅ COMPLETED

- [ ] **Fix test paths that assume “scripts inside new-years-project”**
  - Any test that uses `resolve(__dirname, '../..')` or similar to reach project root should use a fixture directory or the new repo root (e.g. a small fixture in complexity-report).
  - Ensure `__tests__/` run from complexity-report root with `npm test` and all pass.

- [x] **Add or update Vitest config in complexity-report**
  - Copy or adapt from new-years-project so `npm test` in complexity-report runs `scripts/__tests__` (now `__tests__/` at repo root). Update paths in config if needed (e.g. coverage include/exclude).

- [x] **Optional: smoke test**
  - Run the CLI from complexity-report against a real project (e.g. `node report/index.js` or `npx .` with cwd set to new-years-project) and confirm report is generated under that project’s `complexity/`.

---

## Phase 6: Documentation ✅ COMPLETED

- [x] **Root README in complexity-report**
  - What the package does; install (`npm install complexity-report` or similar); CLI usage (`npx complexity-report`, optional flags like `--cwd`, `--show-all`, `--export`); optional programmatic example; requirement for ESLint flat config in the target project; Node version.

- [x] **docs/ in complexity-report**
  - Keep or trim existing docs (TOC, module docs). Remove or update references to “scripts directory” so they refer to the package layout (e.g. “report/”, “integration/”).

- [x] **Changelog / migration note**
  - Short note for consumers: “If you were using the script from new-years-project, install this package and run `npx complexity-report` (or add a script that runs it) from your project root.”

---

## Phase 7: Source repo (new-years-project) after migration

- [ ] **Remove or archive scripts from new-years-project**
  - Either remove `scripts/` from new-years-project and rely on the package, or keep a minimal wrapper that calls the package (e.g. `npx complexity-report` or `node node_modules/complexity-report/report/index.js`).

- [ ] **Update new-years-project package.json**
  - Add `complexity-report` as a dependency (local path while developing: `"complexity-report": "file:../complexity-report"`, or npm name once published).
  - Replace existing complexity scripts, e.g.:
    - `"lint:complexity": "node scripts/report/index.js"` → `"lint:complexity": "complexity-report"` or `"npx complexity-report"`
  - If the package reads `complexityReport.exportDir` from the project’s `package.json`, keep that key in new-years-project’s `package.json` so behavior stays the same.

- [ ] **Verify in new-years-project**
  - From new-years-project root: `npm run lint:complexity` (and `lint:complexity:export` if used) produces the same output as before (e.g. `complexity/index.html`, `complexity/reports/`).

---

## Phase 8: Publish (when ready)

- [ ] **Version and changelog**
  - Bump version in complexity-report; keep a CHANGELOG if you want.

- [ ] **npm publish**
  - From complexity-report: `npm publish` (or `npm publish --access public` for unscoped). Ensure `files` in package.json is correct so only intended files are published.

- [ ] **Switch new-years-project to published package**
  - Replace `file:../complexity-report` with the published version (e.g. `"complexity-report": "^1.0.0"`).

---

## Quick reference: paths

| Current (new-years-project)     | After move (complexity-report)   |
|---------------------------------|----------------------------------|
| `scripts/report/index.js`       | `report/index.js`               |
| `scripts/integration/`          | `integration/`                 |
| `scripts/function-boundaries/`  | `function-boundaries/`         |
| `scripts/function-extraction/`  | `function-extraction/`         |
| `scripts/decision-points/`      | `decision-points/`             |
| `scripts/html-generators/`      | `html-generators/`             |
| `scripts/export-generators/`    | `export-generators/`           |
| `scripts/assets/`              | `assets/`                      |
| `scripts/docs/`                | `docs/`                        |
| `scripts/__tests__/`           | `__tests__/`                   |
| `scripts/README.md`            | Merge into root README or keep as docs |

---

## Notes

- **Single source of truth:** This file is the master checklist for the migration. Update it as items are completed or new steps are discovered.
- **TDD:** Keep running tests in complexity-report after each change (path fixes, cwd handling, asset resolution).
- **Backward compatibility:** Consuming projects (like new-years-project) should need only: install the package, add a script that runs the CLI (or call the API), and optionally set `complexityReport.exportDir` in their `package.json`.
