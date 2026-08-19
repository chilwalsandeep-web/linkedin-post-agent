import Steps from "@/components/Steps";
import SubmitButton from "@/components/SubmitButton";
import { PLATFORMS, TONES } from "@/types";

export const metadata = { title: "New post" };

interface Props {
  searchParams: Promise<{ error?: string; topic?: string }>;
}

export default async function NewPostPage({ searchParams }: Props) {
  const { error, topic } = await searchParams;

  return (
    <>
      <Steps current="topic" />
      <h1>Write a LinkedIn post</h1>
      <p className="lede">
        Give a topic and a tone. Claude researches it on the web, then sends you four angles to pick
        from — and nothing reaches your feed until you approve it.
      </p>

      {error && (
        <div className="banner error" role="alert">
          {error}
        </div>
      )}

      <form method="post" action="/jobs" className="card">
        <div className="field">
          <label htmlFor="topic">What should the post be about?</label>
          <textarea
            id="topic"
            name="topic"
            required
            defaultValue={topic ?? ""}
            placeholder="e.g. What AI agents actually change for product managers in 2026"
          />
          <p className="hint">The sharper the topic, the sharper the angles.</p>
        </div>

        <div className="field">
          <label htmlFor="tone">Tone</label>
          <select id="tone" name="tone" defaultValue={TONES[0]}>
            {TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="platform">Platform</label>
          <select id="platform" name="platform" defaultValue={PLATFORMS[0]}>
            {PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
        </div>

        <div className="actions">
          <SubmitButton pendingLabel="Researching the topic…">Research &amp; suggest angles</SubmitButton>
        </div>
        <p className="hint">This takes about 30 seconds while Claude searches the web.</p>
      </form>
    </>
  );
}
