import Link from "next/link";
import { redirect } from "next/navigation";
import { authenticate } from "../../../dashboard/actions";
import { authClient, authConfig } from "../../../intake/supabase";
import "../../../dashboard/dashboard.css";

export const dynamic = "force-dynamic";

const messages: Record<string, string> = {
  configuration: "Connect your Supabase project to enable sign-in.",
  invalid: "Unable to sign in or create this account. Check your details and use a password of 8–128 characters.",
  confirmation: "Check your email to confirm your account, then return here to sign in.",
  unavailable: "Sign-in is temporarily unavailable. Please try again.",
};

export default async function Login({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const client = await authClient();
  if (client && (await client.auth.getUser()).data.user) redirect("/dashboard");
  const { message } = await searchParams;
  const ready = Boolean(authConfig());
  return <main className="mb-login">
    <section className="mb-login-story">
      <Link href="/en" className="mb-brand">Max Bara<span>.</span></Link>
      <div><p className="mb-eyebrow">YOUR NEXT CHAPTER</p><h1>Big ambitions.<br />A clear path forward.</h1><p>Your company, documents, and next steps.<br />Together in one place.</p></div>
      <p>Company formation in Côte d’Ivoire</p>
    </section>
    <section className="mb-login-panel"><div className="mb-login-form">
      <p className="mb-eyebrow">YOUR WORKSPACE</p><h2>Welcome back.</h2><p>Sign in to keep your business moving.</p>
      {message && messages[message] && <p className="mb-notice" role="status">{messages[message]}</p>}
      {!ready && <p className="mb-notice">Supabase setup is pending. Set <code>SUPABASE_URL</code> and <code>SUPABASE_PUBLISHABLE_KEY</code> in <code>.env.local</code>, then restart the server to enable authentication.</p>}
      <form action={authenticate}>
        <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@company.com" maxLength={254} disabled={!ready} /></label>
        <label>Password<input name="password" type="password" autoComplete="current-password" minLength={8} maxLength={128} required placeholder="At least 8 characters" disabled={!ready} /></label>
        <button className="mb-primary" disabled={!ready} name="mode" value="signin">Sign in</button>
        <button className="mb-secondary" disabled={!ready} name="mode" value="signup">Create an account</button>
      </form>
      <p className="mb-login-foot">Prefer a phone number? <Link href="/en/start">Sign in with SMS</Link></p>
      <Link className="mb-back" href="/en">Back to Max Bara</Link>
    </div></section>
  </main>;
}
