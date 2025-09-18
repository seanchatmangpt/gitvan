# Tightening the Loop: LLMs + Front-Matter Templates

## 🎯 **Current State Analysis**

After reading the README and examining the codebase, GitVan has a sophisticated system but there are opportunities to create a tighter feedback loop between Large Language Models and front-matter templates.

### **Current Architecture Strengths:**
- ✅ **Ollama-first AI** with local processing
- ✅ **Front-matter parsing** with YAML/TOML/JSON support
- ✅ **Template system** with Nunjucks and inflection filters
- ✅ **Job generation** via AI prompts
- ✅ **Deterministic operations** for reproducible builds

### **Current Gaps:**
- ❌ **Static AI prompts** - templates don't evolve based on usage
- ❌ **One-way generation** - no feedback loop from template execution
- ❌ **Manual template creation** - no AI-assisted template generation
- ❌ **Limited context awareness** - AI doesn't learn from successful patterns

## 🚀 **Proposed Tightened Loop Architecture**

### **1. AI-Driven Template Evolution**

Create a system where templates evolve based on successful executions:

```yaml
---
# AI-Generated Front-Matter
ai:
  generated: true
  model: "qwen3-coder:30b"
  prompt: "Create a React component template"
  success_rate: 0.95
  usage_count: 42
  last_improved: "2024-01-15T10:30:00Z"
  feedback:
    - "Users prefer TypeScript interfaces"
    - "Include PropTypes for better DX"
    - "Add Storybook stories by default"
  
# Template Metadata
to: "src/components/{{ name | pascalCase }}.tsx"
force: "overwrite"
inject:
  - into: "src/index.ts"
    snippet: "export { {{ name | pascalCase }} } from './components/{{ name | pascalCase }}';"
    find: "// EXPORTS"
    where: "after"
sh:
  after: ["npm run test:{{ name | kebabCase }}"]
when: "{{ createComponent }}"

# AI Learning Context
learning:
  patterns:
    - "successful_components": ["Button", "Input", "Modal"]
    - "failed_patterns": ["legacy_class_components"]
    - "user_preferences": ["typescript", "tailwind", "storybook"]
---
import React from 'react';
import { {{ name | pascalCase }}Props } from './{{ name | pascalCase }}.types';

export const {{ name | pascalCase }}: React.FC<{{ name | pascalCase }}Props> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`{{ name | kebabCase }} ${className}`} {...props}>
      {children}
    </div>
  );
};
```

### **2. Feedback-Driven AI Prompt Evolution**

Implement a system where AI prompts improve based on template execution success:

```javascript
// AI Prompt Evolution System
export class AIPromptEvolution {
  constructor() {
    this.successPatterns = new Map();
    this.failurePatterns = new Map();
    this.userPreferences = new Map();
  }

  async evolvePrompt(basePrompt, templatePath, executionResult) {
    const feedback = await this.analyzeExecution(templatePath, executionResult);
    
    if (feedback.success) {
      this.successPatterns.set(templatePath, feedback);
      return this.enhancePromptWithSuccess(basePrompt, feedback);
    } else {
      this.failurePatterns.set(templatePath, feedback);
      return this.enhancePromptWithFailure(basePrompt, feedback);
    }
  }

  enhancePromptWithSuccess(basePrompt, feedback) {
    return `${basePrompt}

## Success Patterns Detected:
${feedback.patterns.map(p => `- ${p}`).join('\n')}

## User Preferences:
${feedback.preferences.map(p => `- ${p}`).join('\n')}

## Recommended Enhancements:
${feedback.enhancements.map(e => `- ${e}`).join('\n')}`;
  }
}
```

### **3. Dynamic Template Generation**

Create templates that adapt based on project context and user behavior:

```yaml
---
# Dynamic Template with AI Context
ai:
  context_aware: true
  adapts_to:
    - "project_type"  # Next.js, React, Vue, etc.
    - "user_patterns" # Preferred patterns from git history
    - "team_conventions" # From .gitvan/config
    - "dependencies" # Available packages

# Conditional Generation
to: "src/components/{{ name | pascalCase }}.tsx"
when: "{{ project_type === 'nextjs' }}"

# Alternative outputs based on context
alternatives:
  - when: "{{ project_type === 'react' }}"
    to: "src/components/{{ name | pascalCase }}.tsx"
    template: "react-component.njk"
  - when: "{{ project_type === 'vue' }}"
    to: "src/components/{{ name | pascalCase }}.vue"
    template: "vue-component.njk"

# AI-Generated Content
ai_content:
  prompt: "Generate a {{ project_type }} component with {{ features | join(', ') }}"
  context:
    project_type: "{{ project_type }}"
    features: "{{ features }}"
    user_preferences: "{{ user_preferences }}"
---
{{ ai_generated_content }}
```

### **4. Real-Time Template Optimization**

Implement continuous improvement based on execution metrics:

```javascript
// Template Optimization Engine
export class TemplateOptimizer {
  async optimizeTemplate(templatePath) {
    const metrics = await this.getExecutionMetrics(templatePath);
    const userFeedback = await this.getUserFeedback(templatePath);
    
    // AI-driven optimization
    const optimizationPrompt = `
    Analyze this template's performance and suggest improvements:
    
    Template: ${templatePath}
    Success Rate: ${metrics.successRate}
    Average Execution Time: ${metrics.avgExecutionTime}
    User Feedback: ${userFeedback}
    
    Suggest specific improvements to:
    1. Front-matter directives
    2. Template content
    3. AI generation prompts
    4. User experience
    `;
    
    const improvements = await this.ai.generate(optimizationPrompt);
    return this.applyImprovements(templatePath, improvements);
  }
}
```

### **5. Context-Aware AI Generation**

Enhance AI generation with rich project context:

```javascript
// Context-Aware AI Generator
export class ContextAwareGenerator {
  async generateTemplate(prompt, context) {
    const enrichedPrompt = await this.enrichPrompt(prompt, context);
    
    return await this.ai.generate(`
    Generate a GitVan template with front-matter based on:
    
    User Request: "${prompt}"
    
    Project Context:
    - Type: ${context.projectType}
    - Framework: ${context.framework}
    - Dependencies: ${context.dependencies.join(', ')}
    - User Patterns: ${context.userPatterns.join(', ')}
    - Team Conventions: ${context.teamConventions.join(', ')}
    
    Success Patterns from Similar Projects:
    ${context.successPatterns.map(p => `- ${p}`).join('\n')}
    
    Generate a template that:
    1. Follows successful patterns
    2. Adapts to project context
    3. Includes appropriate front-matter
    4. Uses optimal AI generation prompts
    `);
  }
}
```

## 🔄 **Implementation Strategy**

### **Phase 1: Template Learning System**
1. **Execution Tracking**: Track template execution success/failure
2. **Pattern Recognition**: Identify successful vs failed patterns
3. **User Preference Learning**: Learn from user modifications

### **Phase 2: AI Prompt Evolution**
1. **Dynamic Prompts**: Prompts that adapt based on context
2. **Success Pattern Integration**: Include successful patterns in prompts
3. **Failure Pattern Avoidance**: Avoid known failure patterns

### **Phase 3: Context-Aware Generation**
1. **Project Context Analysis**: Analyze project structure and dependencies
2. **User Pattern Recognition**: Learn from user's git history and preferences
3. **Team Convention Integration**: Incorporate team coding standards

### **Phase 4: Continuous Optimization**
1. **Real-Time Metrics**: Track template performance metrics
2. **Automated Improvements**: AI-driven template optimization
3. **User Feedback Integration**: Incorporate user feedback into improvements

## 🎯 **Key Benefits**

### **For Developers:**
- **Smarter Templates**: Templates that adapt to project needs
- **Better AI Generation**: AI that learns from successful patterns
- **Reduced Manual Work**: Less need to manually create templates
- **Consistent Quality**: Templates improve over time

### **For Teams:**
- **Team Learning**: Templates learn from team patterns
- **Convention Enforcement**: Automatic adherence to team standards
- **Knowledge Capture**: Successful patterns preserved and reused
- **Onboarding**: New team members benefit from learned patterns

### **For GitVan:**
- **Self-Improving System**: Templates get better with usage
- **Reduced Maintenance**: Less manual template maintenance
- **Better User Experience**: More relevant and useful templates
- **Competitive Advantage**: Unique AI-driven template evolution

## 🚀 **Next Steps**

1. **Implement Template Learning System**
2. **Create AI Prompt Evolution Engine**
3. **Build Context-Aware Generation**
4. **Add Continuous Optimization**
5. **Integrate User Feedback Loops**

This tightened loop between LLMs and front-matter templates will create a self-improving system that gets better with every use, providing increasingly relevant and useful templates for developers.



