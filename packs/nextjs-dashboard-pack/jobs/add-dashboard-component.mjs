export default {
  meta: {
    name: "add-dashboard-component",
    desc: "Adds a new dashboard component with modern UI patterns",
  },
  async run(ctx) {
    const { payload } = ctx;

    const componentName = payload?.component_name || "NewComponent";
    const componentType = payload?.component_type || "card";
    const includeAnimation = payload?.include_animation !== false;

    console.log(`🎨 Adding dashboard component: ${componentName}`);
    console.log(`📦 Component type: ${componentType}`);
    console.log(`✨ Include animation: ${includeAnimation ? "Yes" : "No"}`);

    try {
      const fs = await import("fs/promises");
      const path = await import("path");

      // Create components directory if it doesn't exist
      await fs.mkdir("src/components/dashboard", { recursive: true });

      // Generate component based on type
      let componentContent = "";

      switch (componentType) {
        case "card":
          componentContent = generateCardComponent(
            componentName,
            includeAnimation
          );
          break;
        case "chart":
          componentContent = generateChartComponent(
            componentName,
            includeAnimation
          );
          break;
        case "table":
          componentContent = generateTableComponent(
            componentName,
            includeAnimation
          );
          break;
        case "form":
          componentContent = generateFormComponent(
            componentName,
            includeAnimation
          );
          break;
        default:
          componentContent = generateGenericComponent(
            componentName,
            includeAnimation
          );
      }

      const outputPath = path.join(
        "src/components/dashboard",
        `${componentName}.tsx`
      );
      await fs.writeFile(outputPath, componentContent);

      console.log(`✅ Created component: ${componentName}.tsx`);
      console.log(`📁 Location: ${outputPath}`);

      return {
        status: "success",
        message: `Dashboard component '${componentName}' created successfully.`,
        data: {
          componentName,
          componentType,
          includeAnimation,
          outputPath,
        },
      };
    } catch (error) {
      console.error("❌ Error creating component:", error.message);
      return {
        status: "error",
        message: `Failed to create component: ${error.message}`,
        error: error.message,
      };
    }
  },
};

function generateCardComponent(name, includeAnimation) {
  const animationImports = includeAnimation
    ? `import { motion } from 'framer-motion'`
    : "";

  const animationWrapper = includeAnimation
    ? `<motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
    >`
    : '<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">';

  const animationClose = includeAnimation ? "</motion.div>" : "</div>";

  return `import React from 'react'
${animationImports}

interface ${name}Props {
  title?: string
  children?: React.ReactNode
  className?: string
}

export function ${name}({ title, children, className = '' }: ${name}Props) {
  return (
    ${animationWrapper}
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    ${animationClose}
  )
}`;
}

function generateChartComponent(name, includeAnimation) {
  const animationImports = includeAnimation
    ? `import { motion } from 'framer-motion'`
    : "";

  const animationWrapper = includeAnimation
    ? `<motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="h-64"
    >`
    : '<div className="h-64">';

  const animationClose = includeAnimation ? "</motion.div>" : "</div>";

  return `import React from 'react'
${animationImports}
import { Chart } from './Chart'

interface ${name}Props {
  data?: any[]
  type?: 'line' | 'bar' | 'doughnut'
  className?: string
}

export function ${name}({ data = [], type = 'line', className = '' }: ${name}Props) {
  return (
    ${animationWrapper}
      <Chart type={type} data={data} />
    ${animationClose}
  )
}`;
}

function generateTableComponent(name, includeAnimation) {
  const animationImports = includeAnimation
    ? `import { motion } from 'framer-motion'`
    : "";

  const animationWrapper = includeAnimation
    ? `<motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
    >`
    : '<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">';

  const animationClose = includeAnimation ? "</motion.div>" : "</div>";

  return `import React from 'react'
${animationImports}

interface ${name}Props {
  data?: any[]
  columns?: string[]
  className?: string
}

export function ${name}({ data = [], columns = [], className = '' }: ${name}Props) {
  return (
    ${animationWrapper}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, cellIndex) => (
                  <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {String(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ${animationClose}
  )
}`;
}

function generateFormComponent(name, includeAnimation) {
  const animationImports = includeAnimation
    ? `import { motion } from 'framer-motion'`
    : "";

  const animationWrapper = includeAnimation
    ? `<motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >`
    : '<form className="space-y-6">';

  const animationClose = includeAnimation ? "</motion.form>" : "</form>";

  return `import React from 'react'
${animationImports}
import { Input } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface ${name}Props {
  onSubmit?: (data: any) => void
  className?: string
}

export function ${name}({ onSubmit, className = '' }: ${name}Props) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    if (onSubmit) {
      onSubmit({})
    }
  }

  return (
    ${animationWrapper}
      <div className="space-y-4">
        <Input
          label="Name"
          placeholder="Enter name"
          required
        />
        <Input
          label="Email"
          type="email"
          placeholder="Enter email"
          required
        />
        <div className="flex justify-end space-x-4">
          <Button variant="outline" type="button">
            Cancel
          </Button>
          <Button type="submit">
            Submit
          </Button>
        </div>
      </div>
    ${animationClose}
  )
}`;
}

function generateGenericComponent(name, includeAnimation) {
  const animationImports = includeAnimation
    ? `import { motion } from 'framer-motion'`
    : "";

  const animationWrapper = includeAnimation
    ? `<motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-4"
    >`
    : '<div className="p-4">';

  const animationClose = includeAnimation ? "</motion.div>" : "</div>";

  return `import React from 'react'
${animationImports}

interface ${name}Props {
  children?: React.ReactNode
  className?: string
}

export function ${name}({ children, className = '' }: ${name}Props) {
  return (
    ${animationWrapper}
      <div className={\`bg-white rounded-lg shadow-sm border border-gray-200 \${className}\`}>
        {children || (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">${name}</h3>
            <p className="text-gray-600">This is a custom dashboard component.</p>
          </div>
        )}
      </div>
    ${animationClose}
  )
}`;
}
