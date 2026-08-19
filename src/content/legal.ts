// Legal copy lives here as data so the pages stay presentational and the
// LinkedIn app-review requirements (privacy policy + terms URLs) are testable.

export interface LegalSection {
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface LegalDocument {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  intro:
    "This app helps you draft and publish LinkedIn posts on your own LinkedIn account. We store only the data needed to operate the service.",
  sections: [
    {
      heading: "Information we collect",
      bullets: [
        "LinkedIn profile identity information such as your name, email, and member ID when you connect your account.",
        "OAuth access tokens and refresh tokens used to publish to your own LinkedIn feed.",
        "Job details you enter in the app, such as post topic, tone, selected heading, draft text, and revision notes.",
      ],
    },
    {
      heading: "How we use it",
      bullets: [
        "To generate research, draft posts, and send review emails.",
        "To publish approved content to your LinkedIn account through the official LinkedIn API.",
        "To keep your account connected so future approvals can publish automatically.",
      ],
    },
    {
      heading: "Storage",
      paragraphs: [
        "Connection data and job data are stored in Cloudflare Workers KV, scoped to the deployment you are using. Access tokens are never exposed to the browser and are only sent to LinkedIn's official API endpoints.",
      ],
    },
    {
      heading: "Your rights",
      paragraphs: [
        "You can disconnect your LinkedIn account at any time from the account page. That removes the stored connection from the app.",
        "We do not sell personal data. We do not use your data for unrelated marketing or scraping activity.",
      ],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of Service",
  intro:
    "By using this service, you agree to use it to create and publish content to your own LinkedIn account only.",
  sections: [
    {
      heading: "Human approval",
      paragraphs: [
        "Nothing is published to LinkedIn without your explicit review and approval. The app may generate a draft, but the final posting decision always rests with you.",
      ],
    },
    {
      heading: "LinkedIn compliance",
      paragraphs: [
        "This service uses the official LinkedIn API and only posts to your own feed. It is not intended for spam, automation without consent, or posting on behalf of other accounts or company pages.",
      ],
    },
    {
      heading: "Account and token responsibility",
      paragraphs: [
        "You are responsible for keeping your LinkedIn app configuration and tokens secure. If your account configuration changes, reconnect your LinkedIn account as needed.",
      ],
    },
    {
      heading: "Service availability",
      paragraphs: [
        "We may update, pause, or discontinue the service as needed. We do not guarantee uninterrupted availability or specific posting results.",
      ],
    },
  ],
};
