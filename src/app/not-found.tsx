import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <>
      <h1>That page isn&rsquo;t here</h1>
      <div className="banner info">
        If you followed a link from an old email, that job has probably expired. Start a new one.
      </div>
      <div className="actions">
        <Link className="btn" href="/">
          Write a new post
        </Link>
      </div>
    </>
  );
}
