import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { addSnippet } from '../../server/snippets'

export const Route = createFileRoute('/new/')({
  component: NewSnippetForm,
  head: () => ({
    meta: [
      { title: 'Add New Snippet | TanStack Start' },
      {
        name: 'description',
        content: 'Create and save a new code snippet to your collection.',
      },
    ],
  }),
})

function NewSnippetForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)

    try {
      await addSnippet({
        data: {
          title: formData.get('title') as string,
          language: formData.get('language') as string,
          code: formData.get('code') as string,
        },
      })

      await router.invalidate()
      router.navigate({ to: '/' })
    } catch (error) {
      console.error(error)
      setIsSubmitting(false)
    }
  }

  return (
    <main className="page-wrap px-4 pb-8 pt-14 max-w-2xl">
      <div className="mb-8">
        <Link
          to="/"
          className="text-sm font-semibold text-sea-ink-soft hover:text-sea-ink mb-4 inline-flex items-center gap-2 no-underline"
        >
          <span>&larr;</span> Back
        </Link>
        <h1 className="display-title text-4xl font-bold text-sea-ink">
          New Snippet
        </h1>
        <p className="text-sea-ink-soft mt-2">
          Add a new piece of code to your collection.
        </p>
      </div>

      <section className="island-shell rise-in rounded-4xl p-6 sm:p-10">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="title" className="text-sm font-bold text-sea-ink">
              Snippet Title
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              placeholder="ex: Animated Tailwind Button"
              className="rounded-xl border border-line bg-white/50 px-4 py-3 text-sea-ink outline-none transition-colors focus:border-lagoon focus:bg-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="language"
              className="text-sm font-bold text-sea-ink"
            >
              Language
            </label>
            <select
              id="language"
              name="language"
              required
              className="rounded-xl border border-line bg-white/50 px-4 py-3 text-sea-ink outline-none transition-colors focus:border-lagoon focus:bg-white appearance-none"
            >
              <option value="tsx">React (TSX)</option>
              <option value="javascript">JavaScript</option>
              <option value="css">CSS</option>
              <option value="html">HTML</option>
              <option value="python">Python</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="code" className="text-sm font-bold text-sea-ink">
              Your Code
            </label>
            <textarea
              id="code"
              name="code"
              required
              rows={6}
              placeholder="Paste your code here..."
              className="font-mono text-sm rounded-xl border border-line bg-[#0f1a1e] text-[#afcdc8] px-4 py-3 outline-none transition-colors focus:border-lagoon resize-y"
            ></textarea>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-sea-ink px-6 py-3.5 font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-lagoon-deep hover:shadow-lg disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isSubmitting ? 'Saving...' : 'Save Snippet'}
          </button>
        </form>
      </section>
    </main>
  )
}
