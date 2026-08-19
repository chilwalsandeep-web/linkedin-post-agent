import Link from "next/link";
import type { LegalDocument } from "@/content/legal";

/** Renders a privacy policy / terms document from the shared content module. */
export default function LegalDoc({ doc }: { doc: LegalDocument }) {
  return (
    <>
      <h1>{doc.title}</h1>
      <div className="card legal">
        <p>{doc.intro}</p>
        {doc.sections.map((section) => (
          <section key={section.heading ?? section.paragraphs?.[0]}>
            {section.heading && <h2>{section.heading}</h2>}
            {section.paragraphs?.map((text) => (
              <p key={text}>{text}</p>
            ))}
            {section.bullets && (
              <ul>
                {section.bullets.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      <div className="actions">
        <Link className="btn ghost" href="/account">
          ← Back to account
        </Link>
      </div>
    </>
  );
}
