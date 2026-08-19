interface Props {
  text: string;
  /** Connected LinkedIn member, when there is one. */
  authorName?: string | null;
  imageUrl?: string | null;
  reviewNote?: string | null;
}

const LINKEDIN_TRUNCATE_AT = 210; // LinkedIn collapses the post behind "…see more" here

/** The draft rendered roughly the way it will look in the feed. */
export default function PostPreview({ text, authorName, imageUrl, reviewNote }: Props) {
  const name = authorName?.trim() || "Your LinkedIn feed";
  const initials =
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "in";

  const characters = text.length;
  const hashtags = text.match(/#[\p{L}\p{N}_]+/gu)?.length ?? 0;
  const passedReview = Boolean(reviewNote?.startsWith("✓"));

  return (
    <div className="card">
      <div className="preview-head">
        <span className="avatar" aria-hidden="true">
          {initials}
        </span>
        <span>
          <span className="preview-name">{name}</span>
          <br />
          <span className="preview-meta">Draft · visible to anyone</span>
        </span>
      </div>

      <div className="post">{text}</div>
      {imageUrl && (
        /* eslint-disable-next-line @next/next/no-img-element -- KV-served bytes, not a static asset */
        <img className="post-image" src={imageUrl} alt="Generated image for this post" />
      )}

      <div className="post-foot">
        <span className="pill">{characters} characters</span>
        <span className="pill">{hashtags} hashtags</span>
        {characters > LINKEDIN_TRUNCATE_AT && (
          <span className="pill">…see more after {LINKEDIN_TRUNCATE_AT}</span>
        )}
        {reviewNote && <span className={passedReview ? "pill good" : "pill"}>🧑 {reviewNote}</span>}
      </div>
    </div>
  );
}
