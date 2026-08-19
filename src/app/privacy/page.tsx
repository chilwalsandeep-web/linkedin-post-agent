import LegalDoc from "@/components/LegalDoc";
import { PRIVACY_POLICY } from "@/content/legal";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return <LegalDoc doc={PRIVACY_POLICY} />;
}
