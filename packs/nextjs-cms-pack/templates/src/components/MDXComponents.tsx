import React from 'react'
import { MDXProvider } from '@mdx-js/react'
import { promises as fs } from 'fs'
import { join } from 'path'
import { Button } from '@/content/components/Button'
import { Card } from '@/content/components/Card'

// Import all available components
const components = {
  Button,
  Card,
  // Add more components here as you create them
}

export function MDXComponents({ children }: { children: React.ReactNode }) {
  return (
    <MDXProvider components={components}>
      {children}
    </MDXProvider>
  )
}

// Helper function to dynamically import components
export async function getComponent(componentName: string) {
  try {
    const componentPath = join(process.cwd(), 'content/components', `${componentName}.tsx`)
    const componentModule = await import(componentPath)
    return componentModule.default || componentModule[componentName]
  } catch (error) {
    console.warn(`Component ${componentName} not found:`, error)
    return null
  }
}

// Helper function to get all available components
export async function getAllComponents() {
  try {
    const componentsDir = join(process.cwd(), 'content/components')
    const files = await fs.readdir(componentsDir)
    return files
      .filter(file => file.endsWith('.tsx'))
      .map(file => file.replace('.tsx', ''))
  } catch (error) {
    console.warn('No components directory found:', error)
    return []
  }
}
