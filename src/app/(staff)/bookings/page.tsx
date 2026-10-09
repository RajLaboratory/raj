import { requireUser } from "@/lib/auth";
import { assertCan, can } from "@/lib/rbac";
import { basePrisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { formatINR } from "@/lib/money";
import { slotLabel, type BookingLine } from "@/lib/booking";
import { BookingActions } from "./actions";

const TABS = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
const LABEL: Record<(typeof TABS)[number], string> = { PENDING: "Waiting for a call", CONFIRMED: "Confirmed", COMPLETED: "Completed", CANCELLED: "Cancelled" };

export default async function OnlineBookingsPage({ searchParams }: { searchParams: { status?: string; q?: string } }) {
  const user = await requireUser();
  assertCan(user, "order.view");
  const status = (TABS as readonly string[]).includes(searchParams.status ?? "") ? (searchParams.status as (typeof TABS)[number]) : "PENDING";
  const q = searchParams.q?.trim();
  const [rows, counts] = await Promise.all([
    basePrisma.onlineBooking.findMany({
      where: {
        branchId: user.branchId, status,
        ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || q } }, { reference: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: [{ preferredDate: "asc" }, { createdAt: "asc" }],
      take: 200,
    }),
    basePrisma.onlineBooking.groupBy({ by: ["status"], where: { branchId: user.branchId }, _count: true }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const canManage = can(user, "order.create");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Online bookings</h1>
        <p className="text-sm text-[var(--muted)]">Requests from the public booking page. Call the patient to confirm, then register them when they arrive.</p>
      </div>
      <nav className="flex flex-wrap gap-2" aria-label="Booking status">
        {TABS.map((t) => (
          <a
            key={t} href={`/bookings?status=${t}`} aria-current={t === status ? "page" : undefined}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${t === status ? "border-brand-600 bg-brand-600 font-medium text-white" : "border-[var(--line)] bg-[var(--surface)] hover:bg-brand-50"}`}
          >
            {LABEL[t]} ({countOf(t)})
          </a>
        ))}
      </nav>
      <form className="flex gap-2">
        <input type="hidden" name="status" value={status} />
        <input name="q" defaultValue={q} placeholder="Name, phone or reference" className="h-10 w-72 rounded-md border border-[var(--line)] bg-[var(--surface)] px-3 text-sm" />
        <button className="h-10 rounded-md bg-brand-600 px-4 text-sm font-medium text-white">Search</button>
      </form>

      <div className="space-y-3">
        {rows.map((b) => {
          const items = b.items as unknown as BookingLine[];
          return (
            <article key={b.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{b.name}{b.age != null && <span className="font-normal text-[var(--muted)]">, {b.age} years</span>}</div>
                  <a href={`tel:${b.phone}`} className="text-brand-700 underline">{b.phone}</a>
                  {b.email && <div className="text-sm text-[var(--muted)]">{b.email}</div>}
                </div>
                <div className="text-right text-sm">
                  <div className="font-medium">{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(b.preferredDate)}</div>
                  <div>{slotLabel(b.slot)}</div>
                  <div className="text-[var(--muted)]">{b.visitType === "HOME" ? "Home collection" : "Visit the lab"}</div>
                </div>
              </div>
              {b.visitType === "HOME" && b.address && <p className="mt-2 text-sm"><span className="text-[var(--muted)]">Address: </span>{b.address}</p>}
              <ul className="mt-3 flex flex-wrap gap-1.5 text-sm">
                {items.map((i) => (
                  <li key={`${i.kind}-${i.id}`} className="rounded bg-brand-50 px-2 py-0.5">
                    {i.name}{i.labName && <span className="font-medium text-brand-800"> via {i.labName}</span>}{i.kind === "PACKAGE" && <span className="text-[var(--muted)]"> (package)</span>}{i.coveredBy && <span className="text-[var(--muted)]"> (in {i.coveredBy})</span>}
                  </li>
                ))}
              </ul>
              {b.notes && <p className="mt-2 text-sm"><span className="text-[var(--muted)]">Note: </span>{b.notes}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-3">
                <div className="text-xs text-[var(--muted)]">{b.reference}, received {formatDateTime(b.createdAt)}, total {formatINR(b.totalPaise)}</div>
                {canManage && <BookingActions id={b.id} status={b.status} />}
              </div>
            </article>
          );
        })}
        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed border-[var(--line)] p-8 text-center text-[var(--muted)]">
            No {LABEL[status].toLowerCase()} bookings{q ? " match your search" : ""}.
          </div>
        )}
      </div>
    </div>
  );
}
