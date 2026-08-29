import { NavLink } from '@/components/ui/nav-link'

export const dynamic = 'force-static'
export const revalidate = 3600

const WORK: { title: string; body: string; href: string; label: string }[] = [
  {
    title: 'Cover a block.',
    body: 'Pick a street you know and review every independent business on it. Coverage is what the directory is short of. A business with one review can be found in a rating sort; a business with none cannot.',
    href: '/discover',
    label: 'Open discover',
  },
  {
    title: 'Get an owner to claim their listing.',
    body: 'Hours and deals only stay current on a claimed listing, because the owner is the one person allowed to edit them. Most listings arrive from map data and sit unclaimed.',
    href: '/discover',
    label: 'Open discover',
  },
  {
    title: 'Check in where you already spend.',
    body: 'Keep the receipt, scan it within seven days. Verified check-ins are what the community totals on the home page are built from.',
    href: '/discover',
    label: 'Open discover',
  },
  {
    title: 'Work the thinnest category.',
    body: 'The categories page prints a business count next to every category. Take the smallest one and fill it in.',
    href: '/categories',
    label: 'Browse categories',
  },
]

export default function VolunteerPage() {
  return (
    <div className="bg-background">
      <main className="mx-auto max-w-content px-6 pt-16 pb-24">
        <header className="max-w-prose">
          <h1 className="text-h1 font-medium text-foreground">Volunteering</h1>
          <p className="mt-5 text-lead text-muted-foreground">
            There is no application form and no volunteer account. The work is what anyone
            can already do in the app, done deliberately and in one area.
          </p>
        </header>

        <ul className="mt-12 max-w-prose border-t border-border">
          {WORK.map((item, i) => (
            <li
              key={item.title}
              className="grid grid-cols-[2.25rem_1fr] gap-x-4 border-b border-border py-6"
            >
              <span className="meta pt-1">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h2 className="text-h3 font-medium text-foreground">{item.title}</h2>
                <p className="mt-2 text-body text-muted-foreground">{item.body}</p>
                <NavLink
                  href={item.href}
                  className="mt-3 inline-block text-small text-foreground underline underline-offset-4 hover:text-primary"
                >
                  {item.label}
                </NavLink>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-10 max-w-prose text-small text-text-tertiary">
          There is no button for reporting a listing that is wrong. Until there is, a
          review is the only public correction.
        </p>
      </main>
    </div>
  )
}
