import React from 'react'
import { MDXComponents } from './MDXComponents'
import { processMarkdownWithComponents } from '@/lib/mdx'

interface ContentRendererProps {
  content: string
  frontmatter: Record<string, any>
}

export function ContentRenderer({ content, frontmatter }: ContentRendererProps) {
  // Process the markdown content to handle embedded React components
  const processedContent = processMarkdownWithComponents(content)
  
  return (
    <article className="prose prose-lg max-w-4xl mx-auto">
      {/* Render frontmatter title if available */}
      {frontmatter.title && (
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {frontmatter.title}
          </h1>
          {frontmatter.description && (
            <p className="text-xl text-gray-600">
              {frontmatter.description}
            </p>
          )}
          {frontmatter.date && (
            <time className="text-sm text-gray-500">
              {new Date(frontmatter.date).toLocaleDateString()}
            </time>
          )}
        </header>
      )}
      
      {/* Render the processed content */}
      <div className="prose-content">
        <MDXComponents>
          {processedContent}
        </MDXComponents>
      </div>
    </article>
  )
}

