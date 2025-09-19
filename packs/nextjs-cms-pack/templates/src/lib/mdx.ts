import React from 'react'
import { promises as fs } from 'fs'
import { join } from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeStringify from 'rehype-stringify'
import { unified } from 'unified'

// Process markdown content and convert embedded React components
export function processMarkdownWithComponents(content: string): string {
  // Replace React component syntax in markdown
  // Pattern: <ComponentName prop1="value1" prop2="value2" />
  const componentPattern = /<(\w+)([^>]*?)\s*\/>/g
  
  const processedContent = content.replace(componentPattern, (match, componentName, props) => {
    // Convert props string to object
    const propsObj = parsePropsString(props)
    
    // Create a placeholder that will be replaced during rendering
    return `\`\`\`react-component\n${JSON.stringify({
      component: componentName,
      props: propsObj
    })}\n\`\`\``
  })
  
  return processedContent
}

// Parse props string into object
function parsePropsString(propsString: string): Record<string, any> {
  const props: Record<string, any> = {}
  
  // Simple regex to match key="value" or key={value} patterns
  const propPattern = /(\w+)=["']([^"']*)["']|(\w+)=\{([^}]*)\}/g
  let match
  
  while ((match = propPattern.exec(propsString)) !== null) {
    const key = match[1] || match[3]
    const value = match[2] || match[4]
    
    // Try to parse as JSON, fallback to string
    try {
      props[key] = JSON.parse(value)
    } catch {
      props[key] = value
    }
  }
  
  return props
}

// Process markdown files with frontmatter
export async function processMarkdownFile(filePath: string) {
  const fileContent = await fs.readFile(filePath, 'utf8')
  const { data: frontmatter, content } = matter(fileContent)
  
  // Process the content
  const processedContent = processMarkdownWithComponents(content)
  
  return {
    frontmatter,
    content: processedContent,
    rawContent: content
  }
}

// Get all markdown files from a directory
export async function getAllMarkdownFiles(directory: string) {
  try {
    const files = await fs.readdir(directory)
    const markdownFiles = files.filter(file => file.endsWith('.md'))
    
    const pages = await Promise.all(
      markdownFiles.map(async (file) => {
        const filePath = join(directory, file)
        const { frontmatter, content } = await processMarkdownFile(filePath)
        
        return {
          slug: file.replace('.md', ''),
          filePath,
          frontmatter,
          content
        }
      })
    )
    
    return pages
  } catch (error) {
    console.error('Error reading markdown files:', error)
    return []
  }
}

// Convert markdown to HTML using unified
export async function markdownToHtml(content: string) {
  const processor = unified()
    .use(remark)
    .use(remarkGfm)
    .use(remarkRehype)
    .use(rehypeHighlight)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings)
    .use(rehypeStringify)
  
  const result = await processor.process(content)
  return String(result)
}

