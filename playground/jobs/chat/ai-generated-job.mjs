const { defineJob } = require('gitvan');

module.exports = defineJob({
  meta: {
    name: 'documentation-generator',
    version: '1.0.0',
    description: 'Generates documentation from templates and source files',
    author: 'GitVan Team'
  },
  
  on: {
    push: 'refs/heads/main',
    tagCreate: 'v*'
  },

  async run({ ctx, payload, meta }) {
    const git = useGit();
    const template = useTemplate();
    const notes = useNotes();
    const receipt = useReceipt();
    
    const startTime = Date.now();
    
    try {
      // Get repository information
      const repoInfo = await git.info();
      
      // Read source files for documentation
      const sourceFiles = await git.run(['ls-files', '*.js']);
      const sourceFileList = sourceFiles.split('\n').filter(f => f.trim() !== '');
      
      // Generate documentation index
      const indexTemplate = `
# Documentation Index

This document was automatically generated from the codebase.

## Source Files

{% for file in files %}
- [{{ file }}](./{{ file | replace('.js', '.md') }})
{% endfor %}

## Repository Information

- **Name**: {{ repo.name }}
- **Description**: {{ repo.description }}
- **Version**: {{ repo.version }}
- **Last Commit**: {{ repo.lastCommit }}
      `;
      
      const indexContent = await template.renderString(indexTemplate, {
        files: sourceFileList,
        repo: {
          name: repoInfo.name,
          description: repoInfo.description,
          version: repoInfo.version,
          lastCommit: repoInfo.lastCommit
        }
      });
      
      // Write index file
      await git.writeFile('docs/index.md', indexContent);
      
      // Generate individual documentation files for each source file
      const generatedFiles = ['docs/index.md'];
      
      for (const sourceFile of sourceFileList) {
        // Read the source file content
        const fileContent = await git.run(['show', sourceFile]);
        
        // Extract function/class comments and generate documentation
        const docTemplate = `
# {{ fileName }}

## Description

Automatically generated documentation for {{ fileName }}.

## Source Code

\`\`\`javascript
{{ fileContent }}
\`\`\`

## API Reference

This file contains the following:
{% if functions %}
- Functions:
{% for func in functions %}
  - {{ func.name }}: {{ func.description }}
{% endfor %}
{% endif %}

{% if classes %}
- Classes:
{% for cls in classes %}
  - {{ cls.name }}: {{ cls.description }}
{% endfor %}
{% endif %}
        `;
        
        // Simple parsing for demonstration (in reality, you'd use a proper parser)
        const functions = [];
        const classes = [];
        
        // Extract functions and classes (simplified regex-based approach)
        const functionMatches = fileContent.match(/function\s+(\w+)/g) || [];
        const classMatches = fileContent.match(/class\s+(\w+)/g) || [];
        
        functionMatches.forEach(match => {
          functions.push({
            name: match.replace('function ', ''),
            description: 'Function definition'
          });
        });
        
        classMatches.forEach(match => {
          classes.push({
            name: match.replace('class ', ''),
            description: 'Class definition'
          });
        });
        
        const docContent = await template.renderString(docTemplate, {
          fileName: sourceFile,
          fileContent: fileContent.substring(0, 1000) + (fileContent.length > 1000 ? '...' : ''),
          functions,
          classes
        });
        
        // Write individual documentation file
        const docFileName = `docs/${sourceFile.replace('.js', '.md')}`;
        await git.writeFile(docFileName, docContent);
        generatedFiles.push(docFileName);
      }
      
      // Create a summary of what was generated
      const summaryTemplate = `
# Documentation Generation Summary

Generated documentation for {{ count }} source files.

## Generated Files

{% for file in files %}
- {{ file }}
{% endfor %}

## Repository Info

- Name: {{ repo.name }}
- Last Commit: {{ repo.lastCommit }}

## Generated At

{{ timestamp }}
      `;
      
      const summaryContent = await template.renderString(summaryTemplate, {
        count: sourceFileList.length,
        files: generatedFiles,
        repo: {
          name: repoInfo.name,
          lastCommit: repoInfo.lastCommit
        },
        timestamp: new Date().toISOString()
      });
      
      await git.writeFile('docs/GENERATION_SUMMARY.md', summaryContent);
      generatedFiles.push('docs/GENERATION_SUMMARY.md');
      
      // Add to audit trail
      await notes.write(`Documentation generated successfully for ${repoInfo.name}`);
      await notes.append(`Generated ${generatedFiles.length} documentation files`);
      
      // Track job result
      await receipt.write({
        status: 'success',
        artifacts: generatedFiles,
        duration: Date.now() - startTime,
        metadata: {
          sourceFiles: sourceFileList.length,
          generatedFiles: generatedFiles.length
        }
      });
      
      return {
        ok: true,
        artifacts: generatedFiles,
        summary: `Generated documentation for ${sourceFileList.length} files`,
        metadata: {
          sourceFiles: sourceFileList.length,
          generatedFiles: generatedFiles.length
        }
      };
      
    } catch (error) {
      // Track failure
      await receipt.write({
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime
      });
      
      console.error('Documentation generation failed:', error);
      
      return {
        ok: false,
        error: error.message,
        artifacts: [],
        summary: 'Documentation generation failed'
      };
    }
  }
});