import { ContentRenderer } from '@/components/ContentRenderer'
import { promises as fs } from 'fs'
import { join } from 'path'
import matter from 'gray-matter'

export default async function HomePage() {
  // Read the index.md file
  const contentPath = join(process.cwd(), 'content/pages/index.md')
  const fileContent = await fs.readFile(contentPath, 'utf8')
  const { data: frontmatter, content } = matter(fileContent)

  return (
    <main className="container mx-auto px-4 py-8">
      <ContentRenderer 
        content={content} 
        frontmatter={frontmatter}
      />
    </main>
  )
}
