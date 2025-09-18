// Next.js CMS Page Creation Job
export default {
  meta: {
    name: "create-page",
    desc: "Creates a new markdown page with React components",
  },
  async run(ctx) {
    const { payload } = ctx;

    const pageName = payload?.page_name || "new-page";
    const title =
      payload?.title ||
      pageName
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    const description = payload?.description || `This is the ${title} page.`;
    const templateType = payload?.template_type || "simple";

    console.log(`🚀 Creating new page: ${pageName}`);
    console.log(`📄 Using template: ${templateType}`);

    try {
      const fs = await import("fs/promises");
      const path = await import("path");

      // Create content directory if it doesn't exist
      await fs.mkdir("content/pages", { recursive: true });

      // Generate page content based on template type
      let content = "";

      if (templateType === "with-components") {
        content = `---
title: "${title}"
description: "${description}"
date: "${new Date().toISOString()}"
---

# ${title}

This page demonstrates embedding React components in Markdown.

## Interactive Components

Here's a custom \`Button\` component:

<Button onClick={() => alert('You clicked the button!')}>
  Interactive Button
</Button>

And here's a \`Card\` component:

<Card title="Dynamic Content" description="This card's content is passed via props." />

You can even nest components:

<Card title="Nested Example" description="This card contains another button.">
  <Button onClick={() => console.log('Nested button clicked!')}>
    Nested Button
  </Button>
</Card>

This allows for rich, interactive content alongside your static text.`;
      } else {
        content = `---
title: "${title}"
description: "${description}"
date: "${new Date().toISOString()}"
---

# ${title}

This is a simple markdown page without custom React components.

## Section 1

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

### Subsection A

- Item 1
- Item 2
- Item 3

## Section 2

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### Subsection B

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

## Conclusion

This demonstrates basic markdown rendering without React components.`;
      }

      const outputPath = path.join("content", "pages", `${pageName}.md`);
      await fs.writeFile(outputPath, content);

      console.log(
        `✅ Page '${pageName}' created successfully at ${outputPath}`
      );

      return {
        status: "success",
        message: `Page '${pageName}' created successfully`,
        data: {
          pageName,
          outputPath,
          templateType,
          title,
          description,
        },
      };
    } catch (error) {
      console.error(`❌ Failed to create page '${pageName}': ${error.message}`);
      return {
        status: "error",
        message: `Failed to create page: ${error.message}`,
        error: error.message,
      };
    }
  },
};
