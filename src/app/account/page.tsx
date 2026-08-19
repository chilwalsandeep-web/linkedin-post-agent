import Link from "next/link";
import SubmitButton from "@/components/SubmitButton";
import { env, linkedinEnabled, linkedinOAuthConfigured } from "@/config/env";
import { getConnection } from "@/services/connectionStore";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account" };

export default async function AccountPage() {
  const connection = await getConnection();
  const configured = linkedinOAuthConfigured();

  if (connection) {
    return (
      <>
        <h1>LinkedIn connected</h1>
        <p className="lede">Approved posts publish straight to this feed.</p>

        <div className="card">
          <div className="preview-head">
            <span className="avatar" aria-hidden="true">
              {connection.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <span className="preview-name">{connection.name}</span>
              {connection.email && (
                <>
                  <br />
                  <span className="preview-meta">{connection.email}</span>
                </>
              )}
            </span>
          </div>
          <p className="muted">
            Connected {new Date(connection.connectedAt).toLocaleDateString()} · posts to your own feed
            only, via the official LinkedIn API.
          </p>
        </div>

        <form method="post" action="/account/disconnect">
          <SubmitButton className="btn secondary" pendingLabel="Disconnecting…">
            Disconnect
          </SubmitButton>
        </form>

        <div className="actions">
          <Link className="btn ghost" href="/">
            ← New post
          </Link>
        </div>
      </>
    );
  }

  if (!configured) {
    return (
      <>
        <h1>Connect LinkedIn</h1>
        <div className="banner error">LinkedIn sign-in isn&rsquo;t set up on this deployment yet.</div>
        <div className="card">
          <p>
            Add <code>LINKEDIN_CLIENT_ID</code> and <code>LINKEDIN_CLIENT_SECRET</code> as Worker
            secrets, then list this redirect URL under your LinkedIn app → Auth → Authorized redirect
            URLs:
          </p>
          <p>
            <code>{env.LINKEDIN_REDIRECT_URI}</code>
          </p>
          {linkedinEnabled() && (
            <p className="muted">
              A legacy access token is configured, so approved posts will still publish using it.
            </p>
          )}
        </div>
        <div className="actions">
          <Link className="btn ghost" href="/">
            ← New post
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <h1>Connect LinkedIn</h1>
      <p className="lede">
        Connect once so approved posts publish for you. It&rsquo;s one click — you just approve on
        LinkedIn&rsquo;s own screen.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>What this can do</h2>
        <ul className="legal">
          <li>Publish a post you approved to your own feed.</li>
          <li>Read your name and email so drafts show the right author.</li>
        </ul>
        <h2>What it will never do</h2>
        <ul className="legal">
          <li>Post without your explicit approval.</li>
          <li>Send connection requests, DMs, or scrape anything.</li>
        </ul>
        <div className="actions">
          <Link className="btn" href="/connect/linkedin">
            Connect LinkedIn
          </Link>
        </div>
      </div>

      <div className="actions">
        <Link className="btn ghost" href="/">
          ← New post
        </Link>
      </div>
    </>
  );
}
