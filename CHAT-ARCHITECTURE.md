# GitVan Chat Commands Architecture

## 🏗️ **Current State Analysis**

### **Problems with Current Implementation**
1. **Template System Generates Skeletons**: Creates TODO comments instead of working code
2. **AI Specifications Lost**: Detailed AI output is converted to non-functional templates
3. **No Validation**: Generated jobs aren't tested before claiming success
4. **Misleading Messages**: Claims "working job" when it's incomplete
5. **Poor Error Handling**: Falls back to skeletons instead of fixing issues

## 🎯 **Proposed Architecture**

### **1. Multi-Layer Generation System**

```
┌─────────────────────────────────────────────────────────────┐
│                    Chat Command Layer                       │
├─────────────────────────────────────────────────────────────┤
│  draft | generate | preview | apply | explain | validate    │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                 AI Generation Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Specification Generator │ Code Generator │ Test Generator   │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                Implementation Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Composable Builder │ Template Engine │ Code Validator      │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  Output Layer                               │
├─────────────────────────────────────────────────────────────┤
│  File Writer │ Validation │ Testing │ Success Reporting     │
└─────────────────────────────────────────────────────────────┘
```

### **2. Core Components**

#### **A. AI Generation Engine**
```javascript
class AIGenerationEngine {
  // Generate detailed specifications
  async generateSpecification(prompt, context) {
    // Returns structured specification with:
    // - Operations (what to do)
    // - Parameters (inputs/outputs)
    // - Dependencies (composables needed)
    // - Validation rules
  }

  // Generate working code from specification
  async generateImplementation(spec, context) {
    // Returns actual working code using:
    // - Composable patterns
    // - GitVan APIs
    // - Error handling
    // - Validation logic
  }

  // Generate tests for the implementation
  async generateTests(implementation, spec) {
    // Returns test cases that verify functionality
  }
}
```

#### **B. Composable Builder**
```javascript
class ComposableBuilder {
  // Build job using GitVan composables
  buildJob(spec) {
    const composables = this.identifyComposables(spec);
    const code = this.generateComposableCode(composables, spec);
    return this.wrapInJobStructure(code, spec);
  }

  // Identify which composables are needed
  identifyComposables(spec) {
    // Analyzes spec to determine:
    // - useGit for git operations
    // - useTemplate for templating
    // - useNotes for git notes
    // - useExec for external commands
    // - etc.
  }

  // Generate code using composables
  generateComposableCode(composables, spec) {
    // Creates working code like:
    // const git = useGit();
    // const template = useTemplate();
    // await git.commit(message);
    // const result = await template.render('file.njk', data);
  }
}
```

#### **C. Code Validator**
```javascript
class CodeValidator {
  // Validate generated code
  async validateCode(code, spec) {
    const checks = [
      this.checkSyntax(code),
      this.checkComposables(code),
      this.checkImplementation(code, spec),
      this.checkErrorHandling(code)
    ];
    
    return this.aggregateResults(checks);
  }

  // Test generated code
  async testCode(code, spec) {
    // Creates temporary test environment
    // Runs the generated job
    // Verifies it produces expected outputs
    // Returns test results
  }
}
```

### **3. Command Implementation**

#### **A. Enhanced Chat Commands**
```javascript
// Draft Command - Generate specification only
async function draftCommand(prompt, options) {
  const engine = new AIGenerationEngine();
  const spec = await engine.generateSpecification(prompt, options);
  
  return {
    type: 'specification',
    content: spec,
    status: 'draft',
    nextSteps: ['Use "generate" to create implementation']
  };
}

// Generate Command - Create working implementation
async function generateCommand(prompt, options) {
  const engine = new AIGenerationEngine();
  const builder = new ComposableBuilder();
  const validator = new CodeValidator();
  
  // Step 1: Generate specification
  const spec = await engine.generateSpecification(prompt, options);
  
  // Step 2: Generate implementation
  const implementation = await engine.generateImplementation(spec, options);
  
  // Step 3: Build using composables
  const jobCode = builder.buildJob(spec);
  
  // Step 4: Validate code
  const validation = await validator.validateCode(jobCode, spec);
  
  if (!validation.isValid) {
    throw new Error(`Generated code failed validation: ${validation.errors.join(', ')}`);
  }
  
  // Step 5: Test code
  const testResults = await validator.testCode(jobCode, spec);
  
  if (!testResults.passed) {
    throw new Error(`Generated code failed tests: ${testResults.failures.join(', ')}`);
  }
  
  // Step 6: Write file
  const filePath = writeJobFile(jobCode, options);
  
  return {
    type: 'implementation',
    filePath,
    spec,
    validation,
    testResults,
    status: 'working'
  };
}

// Preview Command - Show what will be generated
async function previewCommand(prompt, options) {
  const engine = new AIGenerationEngine();
  const builder = new ComposableBuilder();
  
  const spec = await engine.generateSpecification(prompt, options);
  const jobCode = builder.buildJob(spec);
  
  return {
    type: 'preview',
    spec,
    code: jobCode,
    status: 'ready'
  };
}

// Apply Command - Generate and apply with custom name
async function applyCommand(prompt, options) {
  if (!options.name) {
    throw new Error('Job name required for apply command (use --name)');
  }
  
  const result = await generateCommand(prompt, {
    ...options,
    id: options.name
  });
  
  return {
    ...result,
    status: 'applied',
    message: `Job "${options.name}" applied successfully`
  };
}
```

### **4. Implementation Patterns**

#### **A. Composable Usage Patterns**
```javascript
// Pattern 1: Git Operations
const git = useGit();
await git.commit('feat: add new feature');
await git.tag('v1.2.3');

// Pattern 2: Template Rendering
const template = useTemplate();
const content = await template.render('changelog.njk', {
  commits: await git.logSince('v1.2.2'),
  version: '1.2.3'
});

// Pattern 3: File Operations
await git.writeFile('CHANGELOG.md', content);
await git.writeFile('VERSION', '1.2.3');

// Pattern 4: Notes and Receipts
const notes = useNotes();
await notes.write(`Release v1.2.3 created at ${new Date().toISOString()}`);
```

#### **B. Error Handling Patterns**
```javascript
// Pattern 1: Graceful Degradation
try {
  const result = await git.commit(message);
  return { ok: true, commit: result };
} catch (error) {
  if (error.message.includes('nothing to commit')) {
    return { ok: true, message: 'No changes to commit' };
  }
  throw error;
}

// Pattern 2: Retry Logic
async function retryOperation(operation, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### **5. Quality Assurance**

#### **A. Validation Pipeline**
```javascript
class ValidationPipeline {
  async validate(jobCode, spec) {
    const steps = [
      this.syntaxValidation,
      this.composableValidation,
      this.implementationValidation,
      this.testValidation
    ];
    
    const results = [];
    for (const step of steps) {
      const result = await step(jobCode, spec);
      results.push(result);
      
      if (!result.passed) {
        return { passed: false, errors: results.flatMap(r => r.errors) };
      }
    }
    
    return { passed: true, results };
  }
}
```

#### **B. Testing Framework**
```javascript
class JobTester {
  async testJob(jobCode, spec) {
    // Create test environment
    const testEnv = await this.createTestEnvironment();
    
    // Run job with test data
    const result = await this.runJob(jobCode, spec.testData);
    
    // Verify outputs
    const verification = await this.verifyOutputs(result, spec.expectedOutputs);
    
    return {
      passed: verification.passed,
      results: result,
      verification
    };
  }
}
```

### **6. User Experience Improvements**

#### **A. Progressive Disclosure**
```javascript
// Level 1: Simple prompt
"Create a changelog job"

// Level 2: Detailed prompt
"Create a changelog job that parses conventional commits, categorizes by type, and generates markdown"

// Level 3: Advanced prompt
"Create a changelog job that parses conventional commits since last tag, categorizes by type (feat/fix/breaking), includes contributor info, generates both GitHub release notes and CHANGELOG.md, and posts summary to Slack"
```

#### **B. Interactive Refinement**
```javascript
class InteractiveRefiner {
  async refineJob(prompt, context) {
    // Generate initial version
    const initial = await this.generateInitial(prompt);
    
    // Ask clarifying questions
    const questions = this.generateQuestions(initial);
    const answers = await this.askQuestions(questions);
    
    // Refine based on answers
    const refined = await this.refineImplementation(initial, answers);
    
    return refined;
  }
}
```

### **7. Configuration and Extensibility**

#### **A. Plugin System**
```javascript
class ChatPluginSystem {
  registerPlugin(name, plugin) {
    this.plugins[name] = plugin;
  }
  
  async generateWithPlugins(prompt, context) {
    const results = [];
    
    for (const [name, plugin] of Object.entries(this.plugins)) {
      if (plugin.canHandle(prompt)) {
        const result = await plugin.generate(prompt, context);
        results.push({ plugin: name, result });
      }
    }
    
    return this.mergeResults(results);
  }
}
```

#### **B. Custom Templates**
```javascript
class TemplateManager {
  async loadCustomTemplate(name) {
    // Load user-defined templates
    const template = await this.loadTemplate(`templates/${name}.njk`);
    return template;
  }
  
  async generateWithTemplate(templateName, data) {
    const template = await this.loadCustomTemplate(templateName);
    return await template.render(data);
  }
}
```

## 🚀 **Implementation Roadmap**

### **Phase 1: Core Architecture (Week 1)**
- [ ] Implement AIGenerationEngine
- [ ] Create ComposableBuilder
- [ ] Build CodeValidator
- [ ] Update chat commands

### **Phase 2: Quality Assurance (Week 2)**
- [ ] Implement ValidationPipeline
- [ ] Create JobTester
- [ ] Add comprehensive error handling
- [ ] Update success messages

### **Phase 3: User Experience (Week 3)**
- [ ] Add InteractiveRefiner
- [ ] Implement progressive disclosure
- [ ] Create better error messages
- [ ] Add help and examples

### **Phase 4: Extensibility (Week 4)**
- [ ] Implement PluginSystem
- [ ] Add TemplateManager
- [ ] Create custom template support
- [ ] Add configuration options

## 📊 **Success Metrics**

### **Functional Metrics**
- **Generated jobs work**: 100% of generated jobs should be functional
- **Test coverage**: 90%+ of generated jobs should pass tests
- **Validation success**: 95%+ of generated jobs should pass validation

### **User Experience Metrics**
- **Success rate**: 90%+ of users should successfully generate working jobs
- **Error rate**: <5% of generated jobs should fail at runtime
- **User satisfaction**: Generated jobs should meet user expectations

### **Performance Metrics**
- **Generation time**: <30 seconds for complex jobs
- **Validation time**: <10 seconds for code validation
- **Test time**: <60 seconds for job testing

---

**This architecture addresses the current issues by:**
1. **Generating working code** instead of skeletons
2. **Validating implementations** before claiming success
3. **Testing generated jobs** to ensure they work
4. **Providing clear feedback** about what was generated
5. **Supporting extensibility** through plugins and templates
