import Link from "next/link";
import { ForageLogo } from "@/components/brand/ForageLogo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-canvas text-text-primary">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-10">
          <Link href="/" className="inline-block mb-8">
            <ForageLogo size={24} />
          </Link>
          <h1 className="font-display font-black text-3xl mb-2">Privacy Policy</h1>
          <p className="text-text-muted text-sm">Last updated: May 15, 2025</p>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-text-secondary leading-relaxed">

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">1. Overview</h2>
            <p>Forage ("we," "us," "our") takes your privacy seriously. This Privacy Policy explains what personal data we collect, how we use it, and your rights regarding that data. By using Forage you consent to the practices described here. If you do not agree, please do not use the Service.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">2. Data We Collect</h2>

            <h3 className="font-semibold text-text-primary mb-2 mt-4">Account & Identity</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email address (required for account creation)</li>
              <li>Display name</li>
              <li>Google account ID and profile information (if you sign in with Google)</li>
              <li>Account creation timestamp and last login</li>
            </ul>

            <h3 className="font-semibold text-text-primary mb-2 mt-4">Health & Body Data (entered during onboarding)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Age, biological sex, height, and weight</li>
              <li>Fitness goals (e.g., muscle gain, fat loss)</li>
              <li>Meals per week preference</li>
              <li>ZIP code / location for local grocery pricing</li>
              <li>Weekly grocery budget</li>
            </ul>

            <h3 className="font-semibold text-text-primary mb-2 mt-4">Nutrition & Activity Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Meal logs: food name, calories, macronutrients, date/time, and source (manual or AI photo)</li>
              <li>Food photos uploaded for AI analysis</li>
              <li>Grocery lists and individual grocery items</li>
              <li>Grocery AI chat message history</li>
            </ul>

            <h3 className="font-semibold text-text-primary mb-2 mt-4">Financial & Receipt Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Receipt images you upload</li>
              <li>Parsed receipt data: store name, date, total, and line items</li>
              <li>AI-generated nutritional insights about your purchases</li>
            </ul>

            <h3 className="font-semibold text-text-primary mb-2 mt-4">Technical Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>IP address and device information (collected by Supabase infrastructure)</li>
              <li>Browser type and operating system</li>
              <li>Usage patterns and feature interactions (via server logs)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-text-primary">To provide the Service:</strong> Your health stats, goals, and budget are used to personalize AI grocery recommendations, calorie targets, and macro goals.</li>
              <li><strong className="text-text-primary">AI processing:</strong> Food photos, receipt images, and chat messages are sent to Anthropic's Claude API for analysis. Anthropic processes this data under their own privacy policy.</li>
              <li><strong className="text-text-primary">To store your data securely:</strong> All data is stored in Supabase (PostgreSQL) with row-level security ensuring only you can access your own data.</li>
              <li><strong className="text-text-primary">To improve the Service:</strong> We may analyze aggregated, anonymized usage patterns to improve features. We do not sell or share identifiable personal data for this purpose.</li>
              <li><strong className="text-text-primary">To communicate with you:</strong> If you opt in to notifications, we may send meal reminders or product updates. You can opt out at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">4. Health Data — Special Considerations</h2>
            <p className="mb-3">We collect health-related information including body weight, biological sex, age, and fitness goals. This data is considered sensitive. We handle it as follows:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Health data is stored encrypted at rest in our database.</li>
              <li>Health data is never sold to third parties, advertisers, or data brokers.</li>
              <li>Health data is only used to personalize your in-app experience.</li>
              <li>Food photos and receipt images are processed by Anthropic's API and stored in private cloud storage accessible only to your account. They are not used to train AI models without explicit consent.</li>
              <li>We do not share health data with insurance companies, employers, or healthcare providers.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">5. Data Sharing & Third Parties</h2>
            <p className="mb-3">We do not sell your personal data. We share data only as follows:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-text-primary">Supabase:</strong> Our database and authentication provider. Data is stored on Supabase infrastructure. See supabase.com/privacy.</li>
              <li><strong className="text-text-primary">Anthropic:</strong> Food photos, receipt images, and chat messages are sent to Anthropic's API for AI analysis. Anthropic's data use policy governs this processing. See anthropic.com/privacy.</li>
              <li><strong className="text-text-primary">Google:</strong> If you sign in with Google, Google shares your email and profile with us per their OAuth process. See google.com/privacy.</li>
              <li><strong className="text-text-primary">Legal requirements:</strong> We may disclose data if required by law, court order, or to protect the rights and safety of our users or others.</li>
              <li><strong className="text-text-primary">Business transfers:</strong> If Forage is acquired or merged, your data may transfer to the new entity, which will be bound by this Privacy Policy.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">6. Data Retention</h2>
            <p className="mb-3">We retain your data as long as your account is active. Specific retention practices:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Meal logs and grocery lists: retained indefinitely while your account exists.</li>
              <li>Food photos and receipt images: stored in private cloud storage until you delete them or your account.</li>
              <li>Chat messages: retained with your account for continuity.</li>
              <li>After account deletion: identifiable data is deleted within 30 days. Anonymized, aggregated data may be retained indefinitely for analytics.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">7. Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have the following rights:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-text-primary">Access:</strong> Request a copy of all personal data we hold about you.</li>
              <li><strong className="text-text-primary">Correction:</strong> Request correction of inaccurate data.</li>
              <li><strong className="text-text-primary">Deletion:</strong> Request deletion of your account and all associated data ("right to be forgotten").</li>
              <li><strong className="text-text-primary">Portability:</strong> Request your data in a machine-readable format.</li>
              <li><strong className="text-text-primary">Objection:</strong> Object to certain processing of your data.</li>
              <li><strong className="text-text-primary">Withdraw consent:</strong> Withdraw consent for optional data processing at any time.</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <span className="text-lime">privacy@forage.app</span>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">8. California Privacy Rights (CCPA)</h2>
            <p className="mb-3">California residents have additional rights under the California Consumer Privacy Act (CCPA):</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>The right to know what personal information is collected, used, shared, or sold.</li>
              <li>The right to delete personal information (subject to certain exceptions).</li>
              <li>The right to opt-out of the sale of personal information. <strong className="text-text-primary">We do not sell personal information.</strong></li>
              <li>The right to non-discrimination for exercising your CCPA rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">9. European Users (GDPR)</h2>
            <p className="mb-3">If you are located in the European Economic Area (EEA), we process your data under the following legal bases:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-text-primary">Contract performance:</strong> To provide the Service you signed up for.</li>
              <li><strong className="text-text-primary">Legitimate interests:</strong> To improve the Service and prevent fraud.</li>
              <li><strong className="text-text-primary">Consent:</strong> For optional features such as notifications and processing of special category data (health information).</li>
            </ul>
            <p className="mt-3">You have the right to lodge a complaint with your local data protection authority. Our data may be stored on servers in the United States; we rely on Supabase's data processing agreements to ensure adequate protection for cross-border transfers.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">10. Cookies & Tracking</h2>
            <p>Forage uses only essential session cookies required for authentication. We do not use advertising cookies, cross-site tracking, or analytics cookies that report to third parties. We do not use Meta Pixel, Google Analytics, or similar advertising tracking technologies.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">11. Children's Privacy</h2>
            <p>Forage is not directed at children under 13. We do not knowingly collect personal information from children under 13. If you believe a child under 13 has provided us data, contact us immediately at <span className="text-lime">privacy@forage.app</span> and we will delete the information promptly.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">12. Security</h2>
            <p>We implement industry-standard security measures including encrypted data storage, row-level security on all database tables (each user can only access their own data), secure HTTPS transmission, and private cloud storage for uploaded files. However, no system is 100% secure. We cannot guarantee absolute security and are not responsible for unauthorized access resulting from factors outside our control.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">13. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the new policy with an updated date. Continued use of the Service after changes constitutes acceptance of the revised policy.</p>
          </section>

          <section>
            <h2 className="font-display font-bold text-text-primary text-lg mb-3">14. Contact</h2>
            <p>For privacy-related questions, data requests, or concerns, contact us at: <span className="text-lime">privacy@forage.app</span></p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex gap-4 text-sm">
          <Link href="/terms" className="text-lime hover:text-lime-glow transition-colors">Terms of Service</Link>
          <Link href="/" className="text-text-muted hover:text-text-secondary transition-colors">← Back to Forage</Link>
        </div>
      </div>
    </div>
  );
}
