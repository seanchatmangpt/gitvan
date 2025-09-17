import { defineJob } from "gitvan/define"

export default defineJob({
  meta: { 
    desc: "Generates a React component using templates with configurable props and structure",
    tags: ["react", "component", "template", "generator"],
    author: "GitVan AI",
    version: "1.0.0"
  },
  
  async run({ ctx, payload, meta }) {
    const { useGit } = await import("gitvan/composables/git")
    const { useTemplate } = await import("gitvan/composables/template")
    const { usePack } = await import("gitvan/composables/pack")
    
    const git = useGit()
    const template = await useTemplate()
    const pack = await usePack()
    
    try {
      // Validate payload
      if (!payload || !payload.name) {
        throw new Error('Component name is required')
      }
      
      const componentName = payload.name
      const props = payload.props || []
      const directory = payload.directory || 'src/components'
      const withStyles = payload.withStyles !== false // default to true
      
      console.log(`Generating React component: ${componentName}`)
      
      // Create component directory if it doesn't exist
      const fullDirectory = `${directory}/${componentName}`
      
      // Plan the component generation
      const plan = await template.plan('templates/react-component.njk', {
        name: componentName,
        props: props,
        directory: fullDirectory,
        withStyles: withStyles
      })
      
      console.log(`Planning component generation for: ${componentName}`)
      
      // Apply the plan
      const result = await template.apply(plan)
      
      // Add additional files if needed
      if (withStyles) {
        const stylePlan = await template.plan('templates/react-styles.njk', {
          name: componentName,
          directory: fullDirectory
        })
        const styleResult = await template.apply(stylePlan)
        result.artifacts.push(...styleResult.artifacts)
      }
      
      // Commit changes to Git
      const head = await git.head()
      console.log(`Committing changes to branch: ${head}`)
      
      // Create a receipt in Git notes
      const receipt = {
        job: 'react-component-generator',
        component: componentName,
        timestamp: new Date().toISOString(),
        props: props,
        directory: fullDirectory
      }
      
      await git.noteAppend('refs/notes/gitvan/receipts', JSON.stringify(receipt))
      
      console.log(`Successfully generated React component: ${componentName}`)
      
      return { 
        ok: true, 
        artifacts: result.artifacts,
        summary: `Successfully generated React component: ${componentName}`,
        data: {
          componentName,
          directory: fullDirectory,
          propsCount: props.length,
          withStyles
        }
      }
    } catch (error) {
      console.error('Job failed:', error.message)
      return { 
        ok: false, 
        error: error.message,
        artifacts: []
      }
    }
  }
})