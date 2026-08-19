import LegalDoc from "@/components/LegalDoc";
import { TERMS_OF_SERVICE } from "@/content/legal";

export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return <LegalDoc doc={TERMS_OF_SERVICE} />;
}
