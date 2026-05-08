import { createServerFn } from '@tanstack/react-start'

type SnippetData = {
  title: string
  language: string
  code: string
}

const snippets = [
  {
    id: '1',
    title: 'Tailwind button',
    language: 'tsx',
    code: '<button className="bg-lagoon text-white px-4 py-2 rounded-full">Click</button>',
  },
  {
    id: '2',
    title: 'Fetch API',
    language: 'javascript',
    code: 'const res = await fetch("/api/data");\nconst data = await res.json();',
  },
]

export const getSnippets = createServerFn({ method: 'GET' }).handler(
  async () => {
    await new Promise((resolve) => setTimeout(resolve, 300))
    return snippets
  },
)

export const addSnippet = createServerFn({ method: 'POST' })
  .inputValidator((data: SnippetData) => data)
  .handler(async ({ data }) => {
    await new Promise((resolve) => setTimeout(resolve, 400))

    const newSnippet = {
      id: Math.random().toString(36).substring(7),
      title: data.title,
      language: data.language,
      code: data.code,
    }

    snippets.push(newSnippet)
    return newSnippet
  })
