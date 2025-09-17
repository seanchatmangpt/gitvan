{% if use_typescript %}import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {{% else %}export default function Layout({ children }) {{% endif %}
  return (
    <div className="{% if use_tailwind %}min-h-screen bg-gray-50{% endif %}">
      <header className="{% if use_tailwind %}bg-white shadow{% endif %}">
        <div className="{% if use_tailwind %}max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8{% endif %}">
          <h1 className="{% if use_tailwind %}text-3xl font-bold text-gray-900{% endif %}">
            {{ project_name }}
          </h1>
        </div>
      </header>
      <main>
        {children}
      </main>
      <footer className="{% if use_tailwind %}bg-white border-t border-gray-200 mt-auto{% endif %}">
        <div className="{% if use_tailwind %}max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-600{% endif %}">
          <p>Powered by GitVan & Next.js</p>
        </div>
      </footer>
    </div>
  )
}