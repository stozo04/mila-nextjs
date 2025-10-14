import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Mila Rose Gates",
  description:
    "Privacy Policy for Mila Rose Gates explaining how personal information, including Google user data, is collected, used, shared, and protected.",
};

const UPDATED_AT = "October 6, 2025";

export default function PrivacyPolicyPage() {
  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <h1 className="mb-3">Privacy Policy</h1>
          <p className="text-muted mb-4">Last updated: {UPDATED_AT}</p>

          <p>
            Welcome to Mila Rose Gates. This Privacy Policy explains how we
            collect, use, store, and share personal information when you access
            or use our website, mobile experiences, and connected services
            (collectively, the &quot;Services&quot;). It applies to all users,
            including those who authenticate with a Google account.
          </p>

          <h2 className="mt-5 h4">1. Who We Are</h2>
          <p>
            The Services are operated by Gates Company (&quot;we,&quot;
            &quot;our,&quot; or &quot;us&quot;). If you have questions about
            this policy or your data, please contact us at{" "}
            <Link href="mailto:privacy@milarosegates.com">
              privacy@milarosegates.com
            </Link>
            .
          </p>

          <h2 className="mt-5 h4">2. Information We Collect</h2>
          <p>We collect the following types of information:</p>
          <ul>
            <li>
              <strong>Google user data:</strong> When you sign in with Google,
              we receive your Google account&apos;s basic profile information,
              including your name, email address, and profile picture URL, via
              Google OAuth. We do not request or access any other scopes or
              Google data beyond basic profile and email.
            </li>
            <li>
              <strong>Account information from Supabase:</strong> We store the
              email address and authentication identifiers needed to maintain
              your account, manage authorization, and surface your content.
            </li>
            <li>
              <strong>Content you provide:</strong> If you contribute posts,
              comments, or files, those materials are stored in our Supabase
              database and object storage.
            </li>
            <li>
              <strong>Usage data:</strong> We collect analytics events (page
              views, referrers, device information) through Google Analytics and
              Vercel Analytics to understand how the Services are used and to
              improve performance.
            </li>
            <li>
              <strong>Chat interactions:</strong> Conversations with the
              embedded OpenAI chatbot are sent to OpenAI to generate responses.
              We do not combine chatbot transcripts with Google user data.
            </li>
          </ul>

          <h2 className="mt-5 h4">3. How We Use Information</h2>
          <ul>
            <li>Authenticate users and maintain secure sessions.</li>
            <li>
              Personalize your experience, including remembering your profile
              information and content preferences.
            </li>
            <li>
              Provide, maintain, and improve the Services, including blog posts,
              chat features, and audio streaming.
            </li>
            <li>
              Communicate service updates, respond to support requests, and send
              notices related to account activity.
            </li>
            <li>
              Analyze usage trends and safeguard against fraud, abuse, or
              security threats.
            </li>
          </ul>

          <h2 className="mt-5 h4">4. How We Share Information</h2>
          <p>
            We do not sell personal information or Google user data. We only
            share data with the following parties, and only as necessary to
            provide or improve the Services:
          </p>
          <ul>
            <li>
              <strong>Service providers:</strong> Supabase (hosting, database,
              authentication), OpenAI (chat responses, audio generation), and
              analytics providers (Google Analytics, Vercel Analytics).
            </li>
            <li>
              <strong>Legal compliance:</strong> We may disclose information if
              required by law, subpoena, government request, or to protect the
              rights, property, or safety of our users or the public.
            </li>
          </ul>
          <p>
            We do not transfer Google user data to third parties except as
            required to provide the Services or comply with applicable law.
          </p>

          <h2 className="mt-5 h4">5. Data Retention and Deletion</h2>
          <p>
            We retain account information, including Google user data, for as
            long as your account is active or as needed to provide the Services.
            You may request account deletion by contacting{" "}
            <Link href="mailto:privacy@milarosegates.com">
              privacy@milarosegates.com
            </Link>
            . Upon verification, we will delete your Supabase account records
            and remove associated Google user data within 30 days, unless we are
            required to retain certain information for legal or contractual
            reasons.
          </p>

          <h2 className="mt-5 h4">6. Data Security</h2>
          <p>
            We implement administrative, technical, and physical safeguards to
            protect personal information. This includes encrypted connections
            (HTTPS), role-based access controls in Supabase, and monitoring for
            unauthorized access. While no system is completely secure, we review
            our practices regularly to keep your data safe.
          </p>

          <h2 className="mt-5 h4">7. Your Rights &amp; Choices</h2>
          <ul>
            <li>
              <strong>Access and correction:</strong> You can view and update
              profile details through your account settings. Contact us for
              additional corrections.
            </li>
            <li>
              <strong>Deletion:</strong> Request removal of your account or
              specific content via{" "}
              <Link href="mailto:privacy@milarosegates.com">
                privacy@milarosegates.com
              </Link>
              .
            </li>
            <li>
              <strong>Analytics choices:</strong> Browser settings and ad
              industry tools allow you to control cookies used by Google
              Analytics. You can learn more at{" "}
              <Link
                href="https://tools.google.com/dlpage/gaoptout"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://tools.google.com/dlpage/gaoptout
              </Link>
              .
            </li>
          </ul>

          <h2 className="mt-5 h4">8. Children&apos;s Privacy</h2>
          <p>
            The Services are intended for a family audience but are not designed
            for children under 13 to create accounts. If we learn that we have
            collected personal information from a child without parental
            consent, we will delete that information promptly.
          </p>

          <h2 className="mt-5 h4">9. International Data Transfers</h2>
          <p>
            We host our infrastructure in the United States. By using the
            Services, you consent to transferring your data to the United States
            and other locations where our providers operate.
          </p>

          <h2 className="mt-5 h4">10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. When we do, we
            will revise the &quot;Last updated&quot; date at the top and provide
            additional notice if the changes materially affect Google user data
            practices. Continued use of the Services after changes become
            effective constitutes acceptance of the revised policy.
          </p>

          <h2 className="mt-5 h4">11. Contact Us</h2>
          <p>
            For questions or concerns about this Privacy Policy, contact{" "}
            <Link href="mailto:privacy@milarosegates.com">
              privacy@milarosegates.com
            </Link>{" "}
            or write to Gates Company, 320 4th Ave S Suite 50, Kirkland, WA
            98033, USA.
          </p>
        </div>
      </div>
    </main>
  );
}
