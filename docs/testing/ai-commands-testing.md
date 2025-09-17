# GitVan AI Commands Testing

This document describes the comprehensive testing framework for GitVan AI commands, based on the [AI SDK testing patterns](https://ai-sdk.dev/docs/ai-sdk-core/testing).

## 🧪 **Testing Architecture**

### **Overview**
The testing framework addresses the current issues with GitVan AI commands by providing:
- **Mock AI providers** for deterministic testing
- **Code validation** to ensure generated jobs work
- **Job execution testing** to verify functionality
- **Integration testing** for complete workflows

### **Key Components**

#### **1. Mock AI Provider (`tests/ai-mock-provider.mjs`)**
```javascript
import { MockGitVanAIProvider, MockResponses } from './ai-mock-provider.mjs';

// Create provider with predefined responses
const provider = new MockGitVanAIProvider({
  responses: [MockResponses.changelogJob, MockResponses.backupJob]
});

// Create mock language model
const model = provider.createMockModel();
```

#### **2. Test Utilities (`tests/setup.mjs`)**
```javascript
import { testUtils } from './setup.mjs';

// Get AI test utilities
const aiUtils = testUtils.createAITestUtils();

// Validate generated job code
const validation = aiUtils.validateJobCode(generatedCode);

// Test job execution
const testResult = await aiUtils.testJobExecution(jobCode, testData);
```

#### **3. Main Test Suite (`tests/ai-commands.test.mjs`)**
Comprehensive tests covering:
- AI provider functionality
- Chat command execution
- Job code validation
- Job execution testing
- Integration workflows

## 🚀 **Running Tests**

### **Install Dependencies**
```bash
pnpm install
```

### **Run AI Command Tests**
```bash
# Run all AI tests
pnpm test:ai

# Run with watch mode
pnpm test:ai:watch

# Run with coverage
pnpm test:ai:coverage

# Run specific test file
pnpm test tests/ai-commands.test.mjs
```

### **Using Test Runner Script**
```bash
# Run tests
node scripts/test-ai-commands.mjs

# Watch mode
node scripts/test-ai-commands.mjs watch

# Coverage mode
node scripts/test-ai-commands.mjs coverage

# UI mode
node scripts/test-ai-commands.mjs ui
```

## 📋 **Test Categories**

### **1. AI Provider Testing**
Tests the core AI functionality using mock providers:

```javascript
describe('AI Provider Testing', () => {
  it('should generate text with mock model', async () => {
    const mockModel = new MockLanguageModelV2({
      doGenerate: async () => ({
        finishReason: 'stop',
        usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30 },
        content: [{ type: 'text', text: 'Hello, world!' }],
        warnings: [],
      }),
    });

    const result = await generateText({
      model: mockModel,
      prompt: 'Hello, test!',
    });

    expect(result.text).toBe('Hello, world!');
  });
});
```

### **2. Chat Command Testing**
Tests the `gitvan chat` commands:

```javascript
describe('Chat Command Testing', () => {
  it('should generate working job code', async () => {
    const result = await chatCommand('generate', {
      prompt: 'Create a backup job',
      config: mockConfig
    });

    expect(result.type).toBe('implementation');
    expect(result.filePath).toBeDefined();
    
    // Verify generated file contains working code
    const generatedCode = readFileSync(result.filePath, 'utf8');
    expect(generatedCode).not.toContain('TODO:');
  });
});
```

### **3. Job Code Validation**
Tests the validation of generated job code:

```javascript
describe('Job Code Validation', () => {
  it('should detect syntax errors', async () => {
    const invalidCode = `
export default {
  meta: { desc: "Invalid job" },
  // Missing closing brace
  async run({ ctx, payload, meta }) {
    return { ok: true };
  }
}`;

    const validation = await validateJobCode(invalidCode);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toContain('Syntax error');
  });
});
```

### **4. Job Execution Testing**
Tests the execution of generated jobs:

```javascript
describe('Job Execution Testing', () => {
  it('should execute generated job successfully', async () => {
    const testJobCode = `
export default {
  meta: { desc: "Test job" },
  async run({ ctx, payload, meta }) {
    const git = useGit();
    await git.writeFile('test.txt', 'Hello World');
    return { ok: true, artifacts: ['test.txt'] };
  }
}`;

    const testResult = await testJobExecution(testJobCode);
    expect(testResult.passed).toBe(true);
    expect(testResult.results.artifacts).toContain('test.txt');
  });
});
```

### **5. Integration Testing**
Tests complete workflows:

```javascript
describe('Integration Testing', () => {
  it('should generate and execute a complete changelog job', async () => {
    // Generate job
    const result = await chatCommand('generate', {
      prompt: 'Create a changelog job',
      config: mockConfig
    });

    // Test execution
    const testResult = await testJobExecution(
      readFileSync(result.filePath, 'utf8'),
      { testData: { version: '1.0.0' } }
    );

    expect(testResult.passed).toBe(true);
    expect(testResult.results.artifacts).toContain('CHANGELOG.md');
  });
});
```

## 🔧 **Mock Responses**

### **Predefined Job Types**
The framework includes mock responses for common job types:

```javascript
import { MockResponses } from './ai-mock-provider.mjs';

// Changelog job
MockResponses.changelogJob

// Backup job  
MockResponses.backupJob

// Deployment job
MockResponses.deploymentJob

// Test job
MockResponses.testJob
```

### **Custom Mock Responses**
Create custom responses for specific test scenarios:

```javascript
const customResponse = {
  output: JSON.stringify({
    meta: {
      desc: 'Custom test job',
      tags: ['custom'],
      author: 'Test',
      version: '1.0.0'
    },
    implementation: {
      operations: [
        { type: 'log', description: 'Custom operation' }
      ],
      returnValue: {
        success: 'Custom job completed',
        artifacts: ['custom-output.txt']
      }
    }
  }),
  model: 'custom-model',
  options: { temperature: 0.5 },
  duration: 1000
};

const provider = new MockGitVanAIProvider({
  responses: [customResponse]
});
```

## 📊 **Test Results**

### **Success Metrics**
The tests verify:
- **100% functional**: All generated jobs should work
- **90%+ test coverage**: Generated jobs should pass tests
- **<5% error rate**: Minimal runtime failures
- **<30s generation**: Fast job creation

### **Validation Checks**
Each generated job is validated for:
- **Syntax correctness**: No JavaScript errors
- **Structure compliance**: Proper job format
- **Composable usage**: Valid GitVan composables
- **Implementation completeness**: No TODO comments
- **Execution success**: Job runs without errors

## 🐛 **Debugging Tests**

### **Verbose Output**
```bash
# Run with verbose output
pnpm test:ai --reporter=verbose

# Run specific test
pnpm test:ai --grep "should generate working job code"
```

### **Test Debugging**
```javascript
// Add debug output in tests
console.log('Generated code:', generatedCode);
console.log('Validation result:', validation);
console.log('Test result:', testResult);
```

### **Mock Debugging**
```javascript
// Debug mock responses
const provider = new MockGitVanAIProvider({ responses: [...] });
console.log('Provider responses:', provider.responses);
console.log('Current response:', provider.getNextResponse());
```

## 🔄 **Continuous Integration**

### **GitHub Actions**
```yaml
name: AI Commands Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: pnpm install
      - run: pnpm test:ai:coverage
```

### **Test Reports**
The framework generates:
- **JSON test results**: `test-results.json`
- **Coverage reports**: HTML and JSON formats
- **Verbose logs**: Detailed test execution

## 📚 **Best Practices**

### **1. Test Isolation**
Each test runs in its own directory to avoid conflicts:

```javascript
beforeEach(() => {
  // Create unique test directory
  currentTestDir = join(process.cwd(), `test-ai-${Date.now()}`);
  testUtils = new TestUtils(currentTestDir);
});
```

### **2. Mock Data**
Use predefined mock responses for consistency:

```javascript
const provider = testUtils.createCommonJobProvider();
// Uses MockResponses.changelogJob, backupJob, etc.
```

### **3. Validation First**
Always validate generated code before testing execution:

```javascript
const validation = aiUtils.validateJobCode(generatedCode);
expect(validation.isValid).toBe(true);

const testResult = await aiUtils.testJobExecution(generatedCode);
expect(testResult.passed).toBe(true);
```

### **4. Error Handling**
Test both success and failure scenarios:

```javascript
it('should handle AI generation failures gracefully', async () => {
  // Mock AI provider to throw error
  gitvanGenerateText.mockImplementation = async () => {
    throw new Error('AI provider unavailable');
  };

  const result = await chatCommand('generate', { prompt: 'test' });
  expect(result.fallback).toBe(true);
});
```

---

**This testing framework ensures that GitVan AI commands generate working, validated, and tested automation jobs that users can trust and deploy immediately.**
