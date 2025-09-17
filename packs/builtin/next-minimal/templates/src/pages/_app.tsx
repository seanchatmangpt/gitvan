{% if use_typescript %}import type { AppProps } from 'next/app'{% endif %}
{% if use_tailwind %}import '@/styles/globals.css'{% endif %}

export default function App({ Component, pageProps }{% if use_typescript %}: AppProps{% endif %}) {
  return <Component {...pageProps} />
}