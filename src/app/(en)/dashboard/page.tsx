import Link from "next/link";
import { redirect } from "next/navigation";
import { authClient } from "../../../intake/supabase";
import { listCases } from "../../../intake/store";
import { databaseConfigured } from "../../../server/database";
import { isAdmin } from "../../../admin/auth";
import { logout } from "../../../dashboard/actions";
import "../../../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const client = await authClient();
  if (!client) redirect("/login");
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect("/login");
  let cases: Awaited<ReturnType<typeof listCases>> = [];
  let unavailable = !databaseConfigured();
  let admin = false;
  if (!unavailable) {
    try {
      [cases, admin] = await Promise.all([listCases({ id: user.id, phone: user.phone ?? "" }), isAdmin(user.id)]);
    } catch { console.error("Dashboard application data failed to load; verify the database connection and migrations."); unavailable = true; }
  }
  const { message } = await searchParams;
  const identity = user.email ?? user.phone ?? "Your account";
  const stats = [
    { label: "Total applications", value: cases.length, note: "Your business journey" },
    { label: "In progress", value: cases.filter(c => c.status !== "delivered").length, note: "Taking shape, step by step" },
    { label: "Completed", value: cases.filter(c => c.status === "delivered").length, note: "Ready for the next chapter" },
  ];
  return <div className="mb-dashboard">
    <aside className="mb-sidebar"><Link href="/en" className="mb-brand">Max Bara<span>.</span></Link>
      <p className="mb-nav-label">WORKSPACE</p><nav aria-label="Workspace"><Link href="/dashboard" aria-current="page">Overview</Link><Link href="#applications">My applications</Link><Link href="/en/quote">New estimate</Link><Link href="/en/start">New application</Link><Link href="/en/appointments">Appointments</Link>{admin && <Link href="/en/admin">Administration</Link>}</nav>
      <div className="mb-sidebar-bottom"><span className="mb-avatar">{identity.charAt(0).toUpperCase()}</span><span className="mb-identity">{identity}<small>Personal workspace</small></span><form action={logout}><button title="Sign out">Sign out</button></form></div>
    </aside>
    <main className="mb-main"><header className="mb-topbar"><span>Workspace / Overview</span><Link href="/en">Visit website</Link></header>
      <div className="mb-content"><div className="mb-page-heading"><div><p className="mb-eyebrow">LET’S BUILD WHAT’S NEXT</p><h1>Your business, in motion.</h1><p>A little clarity for every step of your company’s journey.</p></div><div className="application-actions"><Link className="mb-primary" href="/en/start">Start a new application</Link><Link className="mb-secondary" href="/en/appointments">Book an appointment</Link></div></div>
        {message === "signout_failed" && <p className="mb-notice" role="alert">We couldn’t sign you out. Please try again.</p>}
        {unavailable && <p className="mb-notice" role="status">You are signed in. Application records cannot be loaded right now. You can view the new application form or request help; saving will be available when the service is connected.</p>}
        <section className="mb-stats" aria-label="Application overview">{stats.map(stat => <article key={stat.label}><p>{stat.label}</p><strong>{unavailable ? "—" : stat.value}</strong><small>{stat.note}</small></article>)}</section>
        <section className="mb-banner"><div><span className="mb-eyebrow">FROM IDEA TO COMPANY</span><h2>Your next big move starts here.</h2><p>Get a clear estimate for forming your company in Côte d’Ivoire.</p><Link href="/en/quote">Explore your options</Link></div><div className="mb-banner-art" aria-hidden="true"><span>M<span className="mb-art-dot">.</span></span></div></section>
        <section className="mb-applications" id="applications"><div className="mb-section-heading"><div><h2>My applications</h2><p>Everything you’re building, all in one place.</p></div><span>{unavailable ? "Unavailable" : `${cases.length} total`}</span></div>
          {cases.length ? <div className="mb-table-wrap"><table><thead><tr><th>Company</th><th>Reference</th><th>Status</th><th>Details</th></tr></thead><tbody>{cases.map(record => <tr key={record.reference}><td>{record.company_name}</td><td>{record.reference}</td><td><span className={`mb-badge mb-${record.status}`}>{record.status === "delivered" ? "Completed" : record.status === "submitted" ? "In review" : "Draft"}</span></td><td><Link href={`/en/cases/${encodeURIComponent(record.reference)}`}>View application</Link></td></tr>)}</tbody></table></div> : <div className="mb-empty"><span aria-hidden="true">▤</span><h3>{unavailable ? "Applications are unavailable" : "Make your first move."}</h3><p>{unavailable ? "Your applications will appear here when the database is connected." : "Your applications will appear here. Start with an estimate tailored to your business."}</p><Link className="mb-secondary" href="/en/quote">Get my estimate</Link></div>}
        </section><footer className="mb-dashboard-footer">Max Bara. Built for your ambition.<span>Secure account · Supabase Auth</span></footer>
      </div>
    </main>
  </div>;
}
