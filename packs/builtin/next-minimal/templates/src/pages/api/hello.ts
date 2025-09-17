{% if use_typescript %}import type { NextApiRequest, NextApiResponse } from 'next'

type Data = {
  name: string
  message: string
  timestamp: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {{% else %}export default function handler(req, res) {{% endif %}
  res.status(200).json({
    name: '{{ project_name }}',
    message: 'Hello from GitVan-powered Next.js API!',
    timestamp: new Date().toISOString()
  })
}