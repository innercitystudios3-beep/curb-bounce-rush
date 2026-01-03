import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-6">
      <div className="max-w-3xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="bg-card rounded-xl p-8 shadow-lg border border-border">
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: January 3, 2026</p>

          <div className="space-y-8 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to Curb Ball ("we," "our," or "us"). We are committed to protecting your privacy 
                and ensuring the security of your personal information. This Privacy Policy explains how 
                we collect, use, disclose, and safeguard your information when you use our game.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium mt-4 mb-2">2.1 Email Address</h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                When you make a purchase in our game, we collect your email address for the following purposes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li>To send purchase confirmations and receipts</li>
                <li>To restore your purchases on new devices</li>
                <li>To send occasional updates about new features, content, and promotions (with your consent)</li>
                <li>To provide customer support related to your purchases</li>
              </ul>

              <h3 className="text-lg font-medium mt-4 mb-2">2.2 Payment Information</h3>
              <p className="text-muted-foreground leading-relaxed">
                We use Stripe, a third-party payment processor, to handle all payment transactions. 
                We do <strong>not</strong> store or have access to your full credit card number, CVV, 
                or other sensitive payment details. Stripe processes and stores this information securely 
                in compliance with PCI-DSS standards. We only receive and store:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4 mt-2">
                <li>Transaction confirmation and payment status</li>
                <li>Amount paid and currency</li>
                <li>Items purchased</li>
                <li>A unique transaction identifier</li>
              </ul>

              <h3 className="text-lg font-medium mt-4 mb-2">2.3 Game Data</h3>
              <p className="text-muted-foreground leading-relaxed">
                We store your game progress, scores, achievements, and purchased items to provide 
                a consistent gaming experience across sessions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">3. How We Use Your Information</h2>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>To process and fulfill your in-game purchases</li>
                <li>To restore purchases you've previously made</li>
                <li>To send transactional emails (purchase confirmations, receipts)</li>
                <li>To send marketing communications (only with your explicit consent)</li>
                <li>To improve our game and user experience</li>
                <li>To respond to customer support inquiries</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">4. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We do not sell your personal information. We may share your information with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Stripe:</strong> Our payment processor, to complete transactions</li>
                <li><strong>Facebook:</strong> If you play via Facebook Instant Games, for leaderboards and social features</li>
                <li><strong>Legal authorities:</strong> When required by law or to protect our rights</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your information, including 
                encryption in transit (HTTPS/TLS) and secure data storage. However, no method of 
                transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">6. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your data</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications at any time</li>
                <li><strong>Portability:</strong> Request your data in a portable format</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                To exercise these rights, please contact us at the email provided below.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your purchase history and email address for as long as necessary to provide 
                you with the ability to restore purchases and for legal/accounting purposes. You may 
                request deletion of your data at any time by contacting us.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">8. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our game is not directed to children under 13. We do not knowingly collect personal 
                information from children under 13. If you believe we have collected such information, 
                please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">9. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes 
                by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">10. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or our data practices, please 
                contact us at:
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Email:</strong> privacy@curbball.game
              </p>
            </section>

            <section className="pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                By using Curb Ball and making purchases, you acknowledge that you have read and 
                understood this Privacy Policy and agree to our collection, use, and disclosure 
                of your information as described herein.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
