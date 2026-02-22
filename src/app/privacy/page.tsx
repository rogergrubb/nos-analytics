export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-zinc-500 text-sm mb-10">
          Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>

        <div className="space-y-8 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Who We Are</h2>
            <p>
              This privacy policy applies to all websites operated by NumberOneSon Software, including
              PaperVault.one, SellFast.now, BrainCandy.im, FullSendAI.com, and numberoneson.us
              (&quot;our sites&quot;). Our analytics are hosted at analytics.numberoneson.us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">What We Collect</h2>
            <p className="mb-3">We collect minimal, privacy-respecting analytics data to improve our services:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">Device fingerprint</strong> — A hash derived from your screen size, timezone, and language settings. This is NOT your identity — it&apos;s a statistical grouping.</li>
              <li><strong className="text-zinc-300">Page visits</strong> — Which pages you view and how long you spend on them.</li>
              <li><strong className="text-zinc-300">Referrer</strong> — What website or search engine brought you here.</li>
              <li><strong className="text-zinc-300">Device info</strong> — Browser type, operating system, screen size, device category (mobile/desktop/tablet).</li>
              <li><strong className="text-zinc-300">Geographic location</strong> — Country, region, and city derived from your IP address. Your IP is used only for this lookup and is NOT stored.</li>
              <li><strong className="text-zinc-300">Interactions</strong> — Button clicks, scroll depth, and session duration.</li>
              <li><strong className="text-zinc-300">Campaign data</strong> — UTM parameters from links you clicked to reach us.</li>
              <li><strong className="text-zinc-300">JavaScript errors</strong> — Automatically captured to help us fix bugs.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">What We Do NOT Collect</h2>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>We do <strong className="text-zinc-300">not</strong> use cookies.</li>
              <li>We do <strong className="text-zinc-300">not</strong> store your IP address.</li>
              <li>We do <strong className="text-zinc-300">not</strong> collect your name, email, or any personally identifiable information through analytics.</li>
              <li>We do <strong className="text-zinc-300">not</strong> sell, share, or provide your data to any third party.</li>
              <li>We do <strong className="text-zinc-300">not</strong> use any third-party analytics services (Google Analytics, Facebook Pixel, etc.).</li>
              <li>We do <strong className="text-zinc-300">not</strong> track you across websites.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">How Long We Keep Data</h2>
            <p>
              Analytics data is automatically deleted after <strong className="text-zinc-200">90 days</strong>.
              Error logs are deleted after 30 days. There is no long-term archive.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Third-Party Services</h2>
            <p className="mb-2">Our analytics system uses one external service:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">ip-api.com</strong> — Used to determine your approximate geographic location from your IP address. Your IP is sent to this service but is not stored by us.</li>
              <li><strong className="text-zinc-300">Turso (LibSQL)</strong> — Our database provider where analytics data is stored. Data is encrypted at rest.</li>
              <li><strong className="text-zinc-300">Vercel</strong> — Our hosting provider.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Your Rights</h2>
            <p className="mb-3">
              Under the California Consumer Privacy Act (CCPA), the General Data Protection Regulation (GDPR),
              and other applicable laws, you have the right to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li><strong className="text-zinc-300">Opt out</strong> — Enable &quot;Do Not Track&quot; in your browser, and our tracker will not collect any data from you.</li>
              <li><strong className="text-zinc-300">Request deletion</strong> — Contact us to request that any data associated with your device fingerprint be deleted.</li>
              <li><strong className="text-zinc-300">Access your data</strong> — Contact us to request a copy of data associated with your device fingerprint.</li>
              <li><strong className="text-zinc-300">Object to processing</strong> — You may object to our processing of your data at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">How to Opt Out</h2>
            <p className="mb-2">You can prevent tracking by any of these methods:</p>
            <ul className="list-disc list-inside space-y-1 text-zinc-400">
              <li>Enable <strong className="text-zinc-300">&quot;Do Not Track&quot;</strong> in your browser settings.</li>
              <li>Use a <strong className="text-zinc-300">content blocker</strong> or ad blocker.</li>
              <li>Disable JavaScript (our tracker requires JavaScript to function).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Children&apos;s Privacy</h2>
            <p>
              Our services are not directed at children under 13. We do not knowingly collect data from children.
              If you believe a child has provided us data, please contact us and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Changes to This Policy</h2>
            <p>
              We may update this policy from time to time. Changes will be posted on this page with an updated revision date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-white mb-3">Contact</h2>
            <p>
              For privacy inquiries, data deletion requests, or questions about this policy,
              please contact us through numberoneson.us.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 border-t border-zinc-800 text-center text-zinc-600 text-xs">
          © {new Date().getFullYear()} NumberOneSon Software. All rights reserved.
        </div>
      </div>
    </div>
  );
}
