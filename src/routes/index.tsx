import { createFileRoute, Link } from '@tanstack/react-router'
import { getSnippets } from '../server/snippets'

export const Route = createFileRoute('/')({
  component: SnippetsHome,
  loader: async () => await getSnippets(),
})

function SnippetsHome() {
  const snippets = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="display-title text-4xl font-bold text-sea-ink">
            Mes Snippets
          </h1>
          <p className="text-sea-ink-soft mt-2">
            Garde tes meilleurs bouts de code sous la main.
          </p>
        </div>

        <Link
          to="/new"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-sea-ink text-white transition-transform hover:-translate-y-1 hover:bg-lagoon-deep hover:shadow-lg"
          aria-label="Ajouter un snippet"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {snippets.length === 0 ? (
          <p className="col-span-2 text-center py-10 text-sea-ink-soft">
            Aucun snippet pour le moment. Clique sur le + pour en ajouter un !
          </p>
        ) : (
          snippets.map((snippet) => (
            <article
              key={snippet.id}
              className="island-shell flex flex-col rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-sea-ink">
                  {snippet.title}
                </h2>
                <span className="rounded-full bg-sand px-3 py-1 text-xs font-semibold uppercase tracking-wider text-palm">
                  {snippet.language}
                </span>
              </div>
              <div className="mt-auto overflow-hidden rounded-xl bg-[#0f1a1e] p-4">
                <pre className="overflow-x-auto text-sm text-[#afcdc8]">
                  <code>{snippet.code}</code>
                </pre>
              </div>
            </article>
          ))
        )}
      </div>
    </main>
  )
}
