{% if use_typescript %}import { NextPage } from 'next'{% endif %}
import Layout from '@/components/Layout'

{% if use_typescript %}const Home: NextPage = () => {{% else %}export default function Home() {{% endif %}
  return (
    <Layout>
      <div className="{% if use_tailwind %}min-h-screen flex items-center justify-center bg-gray-50{% endif %}">
        <div className="{% if use_tailwind %}text-center{% endif %}">
          <h1 className="{% if use_tailwind %}text-4xl font-bold text-gray-900 mb-4{% endif %}">
            Welcome to {{ project_name }}
          </h1>
          <p className="{% if use_tailwind %}text-lg text-gray-600 mb-8{% endif %}">
            A Next.js application powered by GitVan
          </p>
          <div className="{% if use_tailwind %}space-x-4{% endif %}">
            <a
              href="https://nextjs.org/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="{% if use_tailwind %}bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors{% endif %}"
            >
              Next.js Docs
            </a>
            <a
              href="https://github.com/ruvnet/gitvan"
              target="_blank"
              rel="noopener noreferrer"
              className="{% if use_tailwind %}bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors{% endif %}"
            >
              GitVan Docs
            </a>
          </div>
        </div>
      </div>
    </Layout>
  )
}{% if use_typescript %}

export default Home{% endif %}