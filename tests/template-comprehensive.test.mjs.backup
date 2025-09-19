// GitVan v2 — Comprehensive useTemplate() tests with MemFS
// Tests template rendering, inflection filters, config discovery, and error handling using in-memory file system

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { vol } from 'memfs';
import { useTemplate } from '../composables/template.mjs';
import { findGitVanConfig, findTemplatesDir } from '../utils/config-finder.mjs';

// Mock context for testing
const mockContext = {
  cwd: '/test/project',
  config: {
    templates: {
      dirs: ['templates', 'custom-templates'],
      autoescape: true,
      noCache: false
    }
  },
  now: () => '2024-01-15T10:30:00.000Z'
};

// Mock useGitVan and tryUseGitVan
vi.mock('../core/context.mjs', () => ({
  useGitVan: vi.fn(() => mockContext),
  tryUseGitVan: vi.fn(() => mockContext),
  withGitVan: vi.fn((context, fn) => fn()),
  bindContext: vi.fn(() => mockContext) // This was missing!
}));

describe('useTemplate with MemFS', () => {
  let testDir;
  let templatesDir;
  
  beforeEach(() => {
    // Create in-memory test directory structure
    testDir = '/test-template-comprehensive';
    templatesDir = `${testDir}/templates`;
    vol.mkdirSync(templatesDir, { recursive: true });
    
    // Create test templates
    vol.writeFileSync(
      `${templatesDir}/test.njk`,
      'Hello {{ name | capitalize }}! Today is {{ nowISO }}.'
    );
    
    vol.writeFileSync(
      `${templatesDir}/inflection.njk`,
      `{{ "user" | pluralize }}: {{ count | inflect "user" "users" }}
{{ "user_profile" | camelize }}: {{ "userProfile" | underscore }}
{{ "hello_world" | titleize }}: {{ "HelloWorld" | humanize }}
{{ "test_string" | dasherize }}: {{ "TestString" | classify }}`
    );
    
    vol.writeFileSync(
      `${templatesDir}/filters.njk`,
      `JSON: {{ data | json }}
Slug: {{ "Hello World!" | slug }}
Upper: {{ "hello" | upper }}
Lower: {{ "HELLO" | lower }}
Pad: {{ "5" | pad 3 "0" }}`
    );
  });
  
  afterEach(() => {
    // Clean up in-memory file system
    vol.reset();
  });
  
  describe('basic functionality', () => {
    it('should render template with basic data', async () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.render('test.njk', { name: 'john' });
      
      expect(result).toBe('Hello John! Today is 2024-01-15T10:30:00.000Z.');
    });
    
    it('should render string template', async () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('Hello {{ name }}!', { name: 'world' });
      
      expect(result).toBe('Hello world!');
    });
    
    it('should render to file', async () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const outputPath = `${testDir}/output.txt`;
      
      const result = await template.renderToFile('test.njk', outputPath, { name: 'jane' });
      
      expect(result.path).toBe(outputPath);
      expect(result.bytes).toBeGreaterThan(0);
      
      const content = vol.readFileSync(outputPath, 'utf8');
      expect(content).toBe('Hello Jane! Today is 2024-01-15T10:30:00.000Z.');
    });
  });
  
  describe('inflection filters', () => {
    it('should handle pluralization', async () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "user" | pluralize }}', {});
      expect(result).toBe('users');
    });
    
    it('should handle singularization', async () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "users" | singularize }}', {});
      expect(result).toBe('user');
    });
    
    it('should handle inflect with count', async () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result1 = template.renderString('{{ 1 | inflect "user" "users" }}', {});
      const result2 = template.renderString('{{ 2 | inflect "user" "users" }}', {});
      
      expect(result1).toBe('user');
      expect(result2).toBe('users');
    });
    
    it('should handle camelize', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result1 = template.renderString('{{ "user_profile" | camelize }}', {});
      const result2 = template.renderString('{{ "user_profile" | camelize true }}', {});
      
      expect(result1).toBe('UserProfile');
      expect(result2).toBe('userProfile');
    });
    
    it('should handle underscore', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result1 = template.renderString('{{ "UserProfile" | underscore }}', {});
      const result2 = template.renderString('{{ "UserProfile" | underscore true }}', {});
      
      expect(result1).toBe('user_profile');
      expect(result2).toBe('USER_PROFILE');
    });
    
    it('should handle humanize', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result1 = template.renderString('{{ "user_profile" | humanize }}', {});
      const result2 = template.renderString('{{ "user_profile" | humanize true }}', {});
      
      expect(result1).toBe('User profile');
      expect(result2).toBe('user profile');
    });
    
    it('should handle capitalize', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "hello world" | capitalize }}', {});
      expect(result).toBe('Hello world');
    });
    
    it('should handle dasherize', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "hello_world" | dasherize }}', {});
      expect(result).toBe('hello-world');
    });
    
    it('should handle titleize', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "hello world" | titleize }}', {});
      expect(result).toBe('Hello World');
    });
    
    it('should handle demodulize', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "User::Profile" | demodulize }}', {});
      expect(result).toBe('Profile');
    });
    
    it('should handle tableize', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "UserProfile" | tableize }}', {});
      expect(result).toBe('user_profiles');
    });
    
    it('should handle classify', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "user_profiles" | classify }}', {});
      expect(result).toBe('UserProfile');
    });
    
    it('should handle foreign_key', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result1 = template.renderString('{{ "UserProfile" | foreign_key }}', {});
      const result2 = template.renderString('{{ "UserProfile" | foreign_key true }}', {});
      
      expect(result1).toBe('user_profile_id');
      expect(result2).toBe('USER_PROFILE_ID');
    });
    
    it('should handle ordinalize', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result1 = template.renderString('{{ 1 | ordinalize }}', {});
      const result2 = template.renderString('{{ 2 | ordinalize }}', {});
      const result3 = template.renderString('{{ 3 | ordinalize }}', {});
      
      expect(result1).toBe('1st');
      expect(result2).toBe('2nd');
      expect(result3).toBe('3rd');
    });
    
    it('should handle transform', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "hello" | transform ["upper", "slug"] }}', {});
      expect(result).toBe('hello');
    });
  });
  
  describe('built-in filters', () => {
    it('should handle json filter', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const data = { name: 'test', value: 42 };
      const result = template.renderString('{{ data | json }}', { data });
      
      expect(result).toBe(JSON.stringify(data, null, 0));
    });
    
    it('should handle json filter with spacing', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const data = { name: 'test' };
      const result = template.renderString('{{ data | json 2 }}', { data });
      
      expect(result).toBe(JSON.stringify(data, null, 2));
    });
    
    it('should handle slug filter', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "Hello World!" | slug }}', {});
      expect(result).toBe('hello-world');
    });
    
    it('should handle upper filter', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "hello" | upper }}', {});
      expect(result).toBe('HELLO');
    });
    
    it('should handle lower filter', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ "HELLO" | lower }}', {});
      expect(result).toBe('hello');
    });
    
    it('should handle pad filter', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result1 = template.renderString('{{ "5" | pad 3 }}', {});
      const result2 = template.renderString('{{ "5" | pad 3 "x" }}', {});
      
      expect(result1).toBe('005');
      expect(result2).toBe('xx5');
    });
  });
  
  describe('configuration handling', () => {
    it('should use config paths when available', () => {
      const template = useTemplate();
      expect(template.env.loaders[0].searchPaths).toContain(join(mockContext.cwd, 'templates'));
      expect(template.env.loaders[0].searchPaths).toContain(join(mockContext.cwd, 'custom-templates'));
    });
    
    it('should use custom paths when provided', () => {
      const customPaths = ['/custom/path1', '/custom/path2'];
      const template = useTemplate({ paths: customPaths });
      
      expect(template.env.loaders[0].searchPaths).toEqual(customPaths);
    });
    
    it('should handle autoescape setting', () => {
      const template1 = useTemplate({ autoescape: true });
      const template2 = useTemplate({ autoescape: false });
      
      expect(template1.env.autoescape).toBe(true);
      expect(template2.env.autoescape).toBe(false);
    });
    
    it('should handle noCache setting', () => {
      const template1 = useTemplate({ noCache: true });
      const template2 = useTemplate({ noCache: false });
      
      expect(template1.env.loaders[0].noCache).toBe(true);
      expect(template2.env.loaders[0].noCache).toBe(false);
    });
  });
  
  describe('error handling', () => {
    it('should throw error for undefined variables', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      
      expect(() => {
        template.renderString('{{ undefined_var }}', {});
      }).toThrow();
    });
    
    it('should throw error for now() calls', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      
      expect(() => {
        template.renderString('{{ now() }}', {});
      }).toThrow('Templates must not call now()');
    });
    
    it('should throw error for random() calls', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      
      expect(() => {
        template.renderString('{{ random() }}', {});
      }).toThrow('Templates must not use random()');
    });
    
    it('should handle missing template files gracefully', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      
      expect(() => {
        template.render('nonexistent.njk', {});
      }).toThrow();
    });
  });
  
  describe('context integration', () => {
    it('should include git context in template data', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ git.cwd }}', {});
      
      expect(result).toBe(mockContext.cwd);
    });
    
    it('should include nowISO when available', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ nowISO }}', {});
      
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });
    
    it('should merge additional data with base data', () => {
      const template = await useTemplate({ paths: [templatesDir] });
      const result = template.renderString('{{ name }} {{ git.cwd }}', { name: 'test' });
      
      expect(result).toBe(`test ${mockContext.cwd}`);
    });
  });
  
  describe('environment caching', () => {
    it('should cache environments with same configuration', () => {
      const template1 = useTemplate({ paths: [templatesDir] });
      const template2 = useTemplate({ paths: [templatesDir] });
      
      expect(template1.env).toBe(template2.env);
    });
    
    it('should create different environments for different configurations', () => {
      const template1 = useTemplate({ paths: [templatesDir], autoescape: true });
      const template2 = useTemplate({ paths: [templatesDir], autoescape: false });
      
      expect(template1.env).not.toBe(template2.env);
    });
  });
});

describe('config-finder utilities with MemFS', () => {
  let testDir;
  
  beforeEach(() => {
    testDir = '/test-config-comprehensive';
    vol.mkdirSync(testDir, { recursive: true });
  });
  
  afterEach(() => {
    vol.reset();
  });
  
  it('should find config file in current directory', async () => {
    const configPath = `${testDir}/gitvan.config.js`;
    vol.writeFileSync(configPath, 'export default { templates: { directory: "custom-templates" } };');
    
    const result = await findGitVanConfig(testDir);
    
    expect(result).toBeTruthy();
    expect(result.path).toBe(configPath);
    expect(result.root).toBe(testDir);
    expect(result.config.templates.directory).toBe('custom-templates');
  });
  
  it('should find templates directory from config', async () => {
    const configPath = `${testDir}/gitvan.config.js`;
    const templatesDir = `${testDir}/custom-templates`;
    
    vol.writeFileSync(configPath, 'export default { templates: { directory: "custom-templates" } };');
    vol.mkdirSync(templatesDir, { recursive: true });
    
    const result = await findTemplatesDir(testDir);
    
    expect(result).toBeTruthy();
    expect(result.templatesDir).toBe(templatesDir);
    expect(result.config.templates.directory).toBe('custom-templates');
  });
  
  it('should fallback to default templates directory', async () => {
    const templatesDir = `${testDir}/templates`;
    vol.mkdirSync(templatesDir, { recursive: true });
    
    const result = await findTemplatesDir(testDir);
    
    expect(result).toBeTruthy();
    expect(result.templatesDir).toBe(templatesDir);
    expect(result.config).toBeNull();
  });
});
