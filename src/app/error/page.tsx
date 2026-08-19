import Link from "next/link";

export const metadata = { title: "Something went wrong" };

interface Props {
  searchParams: Promise<{ m?: string }>;
}

/** Where route handlers send the browser when a step fails. */
export default async function ErrorPage({ searchParams }: Props) {
  const { m } = await searchParams;

  return (
    <>
      <h1>Something went wrong</h1>
      <div className="banner error" role="alert">
        {m || "The step didn't complete. Nothing was posted to LinkedIn."}
      </div>
      <p className="lede">
        Nothing was published. You can start a new post, or retry the last step from your email link.
      </p>
      <div className="actions">
        <Link className="btn" href="/">
          Start over
        </Link>
        <Link className="btn ghost" href="/account">
          Check account
        </Link>
      </div>
    </>
  );
}
