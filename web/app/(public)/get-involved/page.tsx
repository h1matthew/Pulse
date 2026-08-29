import { NavLink } from '@/components/ui/nav-link'

export const dynamic = 'force-static'
export const revalidate = 3600

// Only actions that exist in the product today.
const ACTIONS: { title: string; body: string; href: string; label: string }[] = [
  {
    title: 'Review a place you already go to.',
    body: 'A review written here sits on the business page beside the imported ones and is tagged as ours. If you have checked in at that business before, it is marked as a verified purchase, and the server decides that, not you. One review per business, ten characters minimum.',
    href: '/discover',
    label: 'Find a business',
  },
  {
    title: 'Check in with your receipt.',
    body: 'Photograph the receipt from a visit you already made, within seven days of the purchase. Verified check-ins are the only thing that moves your totals or a mission.',
    href: '/discover',
    label: 'Find a business',
  },
  {
    title: 'Claim a deal before it expires.',
    body: 'Deals are posted by owners and run out. Claiming one gives you a code to show at the counter.',
    href: '/deals',
    label: 'Browse deals',
  },
  {
    title: 'Bookmark the places you keep going back to.',
    body: 'Bookmarks work without an account on the device you are using, and follow you once you sign in.',
    href: '/bookmarks',
    label: 'Open bookmarks',
  },
  {
    title: 'Run a boost mission.',
    body: 'A mission asks for a specific run of visits, such as three different shops in one category. A second visit to the same business does not count twice. Signing in is required.',
    href: '/missions',
    label: 'See missions',
  },
]

export default function GetInvolvedPage() {
  return (
    <div className="bg-background">
      <main className="mx-auto max-w-content px-6 pt-16 pb-24">
        <header className="max-w-prose">
          <h1 className="text-h1 font-medium text-foreground">Things you can do</h1>
          <p className="mt-5 text-lead text-muted-foreground">
            Five actions, all of them inside the app, each one leaving something behind
            for the next person who looks.
          </p>
        </header>

        <ul className="mt-12 max-w-prose border-t border-border">
          {ACTIONS.map((action, i) => (
            <li
              key={action.title}
              className="grid grid-cols-[2.25rem_1fr] gap-x-4 border-b border-border py-6"
            >
              <span className="meta pt-1">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h2 className="text-h3 font-medium text-foreground">{action.title}</h2>
                <p className="mt-2 text-body text-muted-foreground">{action.body}</p>
                <NavLink
                  href={action.href}
                  className="mt-3 inline-block text-small text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {action.label}
                </NavLink>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-prose text-small text-text-tertiary">
          If you run a business and want it listed, there is no self-serve form yet. Most
          listings come in from public map data before anyone asks us.
        </p>
      </main>
    </div>
  )
}
