import { NavLink } from '@/components/ui/nav-link'

export const dynamic = 'force-static'
export const revalidate = 3600

// Each rule maps to something enforced in the codebase, not an intention.
const RULES: { title: string; body: string }[] = [
  {
    title: 'Listings are not for sale.',
    body: 'Pulse has no billing, no ad slots, and no sponsored results. A business cannot buy a listing, a position, or a badge, because there is nothing to buy and no way to pay us.',
  },
  {
    title: 'A business does not have to know about us to be listed.',
    body: 'Most listings start from public map data. We add the business first; the owner claims the page later if they want to edit hours, post a deal, or answer a review. Nobody is left out for not signing up.',
  },
  {
    title: 'You choose the order.',
    body: 'Distance is the default. You can switch to rating, review count, or name. The rating sort weights each score by how many reviews stand behind it, so one five-star review does not beat forty four-star ones. No sort reads money, because there is no money to read.',
  },
  {
    title: 'National chains are dropped from search.',
    body: 'Results pulled live from the map provider are filtered against a brand list kept in the code, and the chains never reach the page. Discover has an independent-only toggle, and category pages rank independents above chains.',
  },
  {
    title: 'A check-in needs a receipt.',
    body: 'You photograph the receipt. It is read and matched against that business before the visit counts, it has to be less than seven days old, and it is stored privately. When verification is unavailable the check-in fails. We would rather lose a real visit than record one that did not happen.',
  },
  {
    title: 'Reviews carry their source.',
    body: 'Every review is tagged as written on Pulse or imported from Google or Yelp. Imported reviews cannot be edited or deleted through Pulse; the database refuses the write. A star rating is the average of both kinds.',
  },
  {
    title: 'Closed businesses come off the list.',
    body: 'Anything the map provider marks permanently closed is dropped when we import it and again every time the nearby list refreshes.',
  },
  {
    title: 'Browsing takes no account.',
    body: 'Discover, categories, deals, business pages, reviews, and the leaderboard are open to anyone. An account is required only to check in, review, bookmark, or claim a deal.',
  },
]

export default function MissionPage() {
  return (
    <div className="bg-background">
      <main className="mx-auto max-w-content px-6 pt-16 pb-24">
        <header className="max-w-prose">
          <h1 className="text-h1 font-medium text-foreground">How we pick</h1>
          <p className="mt-5 text-lead text-muted-foreground">
            Pulse is a directory of the businesses near you. These are the rules it runs
            on. Most of them you can check from the outside.
          </p>
        </header>

        <ol className="mt-12 max-w-prose border-t border-border">
          {RULES.map((rule, i) => (
            <li
              key={rule.title}
              className="grid grid-cols-[2.25rem_1fr] gap-x-4 border-b border-border py-6"
            >
              <span className="meta pt-1">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h2 className="text-h3 font-medium text-foreground">{rule.title}</h2>
                <p className="mt-2 text-body text-muted-foreground">{rule.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className="mt-16 max-w-prose">
          <h2 className="text-h2 font-medium text-foreground">How the math works</h2>
          <p className="mt-5 text-body text-muted-foreground">
            Pulse puts a dollar figure on your check-ins. Here is the whole calculation,
            including the part of it we cannot defend.
          </p>

          <div className="mt-6 rounded-md border border-border bg-surface-1 p-4 font-mono text-meta text-foreground">
            <p>total spend = sum of the totals on your verified receipts</p>
            <p className="mt-2">
              a receipt with no readable total counts as $35
            </p>
            <p className="mt-2">dollars kept local = total spend &times; 0.68</p>
          </div>

          <p className="mt-6 text-body text-muted-foreground">
            The 0.68 is the share of a dollar we assume stays in your area when you spend
            it at an independent business instead of a chain. We cannot show you where
            that number came from. It sits in our code with no source attached, and we are
            not going to attach a study we have not read. Your receipts are real. The
            multiplier is an assumption.
          </p>
          <p className="mt-4 text-body text-muted-foreground">
            Two smaller figures work the same way: one job supported per $100,000 kept
            local, and half a pound of CO2 per check-in. Both are round numbers with the
            same missing citation.
          </p>
          <p className="mt-4 text-body text-muted-foreground">
            What is exact: how many times you checked in, which businesses you visited,
            and the totals printed on the receipts you scanned. Those come from your own
            activity and nothing else.
          </p>

          <p className="mt-6 text-body text-muted-foreground">
            <NavLink
              href="/dashboard"
              className="text-foreground underline underline-offset-4 hover:text-primary"
            >
              Your own figures are on the dashboard
            </NavLink>
            .
          </p>
        </section>
      </main>
    </div>
  )
}
