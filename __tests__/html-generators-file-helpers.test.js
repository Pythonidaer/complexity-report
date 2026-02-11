import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  detectLanguage,
  getPrettifyRelativePath,
  getIndentChars,
  readSourceFile,
  getFilePagePaths,
} from '../html-generators/file-helpers.js';

describe('html-generators/file-helpers', () => {
  describe('detectLanguage', () => {
    it('returns lang-js for .js and .jsx', () => {
      expect(detectLanguage('a.js')).toBe('lang-js');
      expect(detectLanguage('a.jsx')).toBe('lang-js');
    });
    it('returns lang-ts for .ts and .tsx', () => {
      expect(detectLanguage('b.ts')).toBe('lang-ts');
      expect(detectLanguage('b.tsx')).toBe('lang-ts');
    });
    it('returns lang-js for unknown or missing extension', () => {
      expect(detectLanguage('file')).toBe('lang-js');
      expect(detectLanguage('file.xyz')).toBe('lang-js');
    });
    it('returns mapped language for known extensions', () => {
      expect(detectLanguage('a.css')).toBe('lang-css');
      expect(detectLanguage('a.json')).toBe('lang-json');
      expect(detectLanguage('a.md')).toBe('lang-md');
    });
  });

  describe('getPrettifyRelativePath', () => {
    it('returns empty string when filePath has no slash', () => {
      expect(getPrettifyRelativePath('index.js')).toBe('');
    });
    it('returns empty string when fileDir is empty', () => {
      expect(getPrettifyRelativePath('')).toBe('');
    });
    it('returns ../ per depth level', () => {
      expect(getPrettifyRelativePath('src/a.js')).toBe('../');
      expect(getPrettifyRelativePath('src/lib/a.js')).toBe('../../');
    });
  });

  describe('getIndentChars', () => {
    it('returns 0 for null or empty line', () => {
      expect(getIndentChars(null)).toBe(0);
      expect(getIndentChars('')).toBe(0);
    });
    it('returns 0 when no leading whitespace', () => {
      expect(getIndentChars('code')).toBe(0);
    });
    it('returns indent length for spaces', () => {
      expect(getIndentChars('  x')).toBe(2);
    });
    it('expands tabs to 2 spaces', () => {
      expect(getIndentChars('\tx')).toBe(2);
    });
  });

  describe('readSourceFile', () => {
    it('returns empty when file does not exist', () => {
      const result = readSourceFile('/nonexistent/path', 'path');
      expect(result.sourceCode).toBe('');
      expect(result.sourceLines).toEqual([]);
    });
    it('returns source when file exists', () => {
      const result = readSourceFile(process.cwd() + '/package.json', 'package.json');
      expect(result.sourceCode.length).toBeGreaterThan(0);
      expect(result.sourceLines.length).toBeGreaterThan(0);
    });
  });

  describe('getFilePagePaths', () => {
    it('uses index.html and no prefix when fileDir is empty', () => {
      const paths = getFilePagePaths('index.js', '');
      expect(paths.backLink).toBe('index.html');
      expect(paths.aboutPath).toBe('about.html');
      expect(paths.prettifyCssPath).toBe('prettify.css');
      expect(paths.folderIndexPath).toBe('index.html');
    });
    it('uses relative prefix when fileDir has depth', () => {
      const paths = getFilePagePaths('src/foo.js', 'src');
      expect(paths.backLink).toBe('../index.html');
      expect(paths.aboutPath).toBe('../about.html');
      expect(paths.prettifyCssPath).toBe('../prettify.css');
    });
    it('uses prettify path from filePath when in subdir', () => {
      const paths = getFilePagePaths('src/components/Bar.jsx', 'src/components');
      expect(paths.prettifyCssPath).toContain('prettify.css');
      expect(paths.backLink).toBe('../../index.html');
    });
  });
});
