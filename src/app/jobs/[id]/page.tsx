import Link from "next/link";
import { notFound } from "next/navigation";
import CopyButton from "@/components/CopyButton";
import PostPreview from "@/components/PostPreview";
import Steps from "@/components/Steps";
import SubmitButton from "@/components/SubmitButton";
import { imageEnabled } from "@/config/env";
import { getConnection } from "@/services/connectionStore";
import { loadJob } from "@/services/jobStore";
import { Job } from "@/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your post" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function JobPage({ params }: Props) {
  const { id } = await params;
  const job = await loadJob(id);
  if (!job) notFound();

  if (job.status === "posted" || job.status === "approved") return <Done job={job} />;
  if (!job.selectedHeading) return <PickAngle job={job} />;
  if (!job.draft) return <ImageChoice job={job} />;
  return <Review job={job} />;
}

/* ---------- Step 2: choose one of the four angles ---------- */

function PickAngle({ job }: { job: Job }) {
  return (
    <>
      <Steps current="angle" />
      <h1>Four angles on your topic</h1>
      <p className="lede">
        These are also in your inbox. Pick the one you would actually want to read.
      </p>

      <div className="angles">
        {job.headings.map((heading, i) => (
          <Link key={heading} href={`/jobs/${job.id}/select/${i}`} className="angle">
            <span className="angle-num" aria-hidden="true">
              {i + 1}
            </span>
            <span>{heading}</span>
            <span className="angle-cta" aria-hidden="true">
              →
            </span>
          </Link>
        ))}
      </div>

      {job.brief && (
        <details className="card tight">
          <summary className="muted">What Claude found while researching</summary>
          <p className="muted" style={{ marginTop: 10 }}>
            {job.brief}
          </p>
        </details>
      )}

      <p className="muted">
        Topic: {job.topic} · Tone: {job.tone}
      </p>
    </>
  );
}

/* ---------- Step 3: image or text only ---------- */

async function ImageChoice({ job }: { job: Job }) {
  const imagesOn = imageEnabled();

  return (
    <>
      <Steps current="image" />
      <h1>Add an image?</h1>
      <p className="lede">Your angle:</p>
      <div className="card">{job.selectedHeading}</div>

      {!imagesOn && (
        <div className="banner info">
          Image generation is off for this deployment — set <code>IMAGE_PROVIDER=openai</code> and{" "}
          <code>OPENAI_API_KEY</code> to turn it on. &ldquo;Text only&rdquo; is the way to go.
        </div>
      )}

      <div className="actions">
        <form method="post" action={`/jobs/${job.id}/generate`}>
          <input type="hidden" name="image" value="yes" />
          <SubmitButton className="btn secondary" pendingLabel="Writing + drawing…">
            Generate with image
          </SubmitButton>
        </form>
        <form method="post" action={`/jobs/${job.id}/generate`}>
          <input type="hidden" name="image" value="no" />
          <SubmitButton pendingLabel="Writing the post…">Text only</SubmitButton>
        </form>
      </div>

      <p className="hint">
        Claude writes the post, then a second reviewer agent rewrites it until it reads human and
        simple. Give it about a minute.
      </p>
    </>
  );
}

/* ---------- Step 4: review, revise, approve ---------- */

async function Review({ job }: { job: Job }) {
  const connection = await getConnection();

  return (
    <>
      <Steps current="review" />
      <h1>Review your post</h1>
      <p className="lede">
        Nothing goes to LinkedIn until you press approve.
        {connection ? ` It will publish as ${connection.name}.` : " No account is connected yet — you'll get copy-paste text."}
      </p>

      <PostPreview
        text={job.draft ?? ""}
        authorName={connection?.name}
        imageUrl={job.hasImage ? `/jobs/${job.id}/image.png` : null}
        reviewNote={job.reviewNote}
      />

      <div className="actions">
        <form method="post" action={`/jobs/${job.id}/approve`}>
          <SubmitButton pendingLabel="Publishing…">
            {connection ? "Approve & post to LinkedIn" : "Approve"}
          </SubmitButton>
        </form>
        <CopyButton text={job.draft ?? ""} />
      </div>

      <div className="divider">or send it back for another pass</div>

      <form method="post" action={`/jobs/${job.id}/revise`} className="card">
        <div className="field">
          <label htmlFor="notes">What should change?</label>
          <textarea
            id="notes"
            name="notes"
            required
            placeholder="e.g. Make it punchier, open with a concrete example, drop the last hashtag"
          />
          <p className="hint">The AI rewrites from scratch with your notes applied.</p>
        </div>
        <div className="actions">
          <SubmitButton className="btn ghost" pendingLabel="Rewriting…">
            Regenerate with changes
          </SubmitButton>
        </div>
      </form>

      <p className="muted">
        Angle: {job.selectedHeading}
        {job.revisionNotes.length > 0 && ` · ${job.revisionNotes.length} revision(s) so far`}
      </p>
    </>
  );
}

/* ---------- Step 5: done ---------- */

async function Done({ job }: { job: Job }) {
  const connection = await getConnection();
  const posted = job.postedToLinkedIn;

  return (
    <>
      <Steps current="done" />
      <h1>{posted ? "Posted to LinkedIn" : "Approved — ready to paste"}</h1>
      <div className={posted ? "banner success" : "banner info"}>
        {posted
          ? "This is live on your feed now."
          : "No LinkedIn account is connected, so nothing was published. Copy the text below and paste it into LinkedIn."}
      </div>

      <PostPreview
        text={job.draft ?? ""}
        authorName={connection?.name}
        imageUrl={job.hasImage ? `/jobs/${job.id}/image.png` : null}
      />

      <div className="actions">
        <CopyButton text={job.draft ?? ""} />
        {!posted && (
          <Link className="btn ghost" href="/account">
            Connect LinkedIn
          </Link>
        )}
        <Link className="btn secondary" href="/">
          Write another post
        </Link>
      </div>
    </>
  );
}
