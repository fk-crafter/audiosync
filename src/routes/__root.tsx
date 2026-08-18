import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from '@tanstack/react-router'

import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'AudioSync' },
    ],
    links: [{ rel: 'icon', type: 'image/png', href: '/logo.png' }],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-zinc-900">
      <h1 className="text-2xl font-semibold tracking-tight">
        404 - Page introuvable
      </h1>
    </div>
  ),
})

function RootComponent() {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body className="bg-zinc-50 text-zinc-900 antialiased selection:bg-zinc-200">
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}
