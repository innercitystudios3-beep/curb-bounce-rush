import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="bg-card rounded-xl p-6 md:p-8 shadow-lg border">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Terms of Service
            </h1>
          </div>

          <p className="text-muted-foreground mb-6">
            Last updated: January 3, 2026
          </p>

          <div className="space-y-8 text-foreground">
            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">
                1. Acceptance of Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using CurbBall (the "Game"), you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our Game. We reserve the right to 
                update these terms at any time, and your continued use of the Game constitutes acceptance 
                of any changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">
                2. Game License
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We grant you a limited, non-exclusive, non-transferable, revocable license to use the Game 
                for your personal, non-commercial entertainment purposes, subject to these Terms.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>You may not modify, distribute, or create derivative works of the Game</li>
                <li>You may not reverse engineer or attempt to extract source code</li>
                <li>You may not use the Game for any commercial purpose without permission</li>
                <li>You may not exploit bugs or glitches for unfair advantage</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">
                3. In-Game Purchases
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                The Game offers optional in-game purchases for virtual items such as ball skins and backdrops.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>All purchases are final and non-refundable unless required by law</li>
                <li>Virtual items have no real-world monetary value and cannot be traded or sold</li>
                <li>Prices are displayed in USD and may vary by region</li>
                <li>We reserve the right to modify pricing at any time</li>
                <li>You must be of legal age or have parental consent to make purchases</li>
                <li>Lost purchases can be restored using the "Restore Purchases" feature</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">
                4. Virtual Currency (Coins)
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                The Game features virtual currency ("Coins") that can be earned through gameplay.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Coins have no real-world value and cannot be exchanged for money</li>
                <li>Coins are non-transferable between accounts</li>
                <li>We reserve the right to modify coin earning rates or values</li>
                <li>Coin balances may be reset in case of detected abuse or cheating</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">
                5. User Conduct
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                When using the Game, you agree not to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Use cheats, exploits, automation software, or any unauthorized third-party tools</li>
                <li>Interfere with or disrupt game servers or networks</li>
                <li>Attempt to gain unauthorized access to other accounts</li>
                <li>Engage in any activity that violates applicable laws</li>
                <li>Harass, abuse, or harm other players</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">
                6. Account Termination
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to suspend or terminate your access to the Game at any time, 
                without prior notice, for conduct that we believe violates these Terms or is harmful 
                to other users, us, or third parties, or for any other reason at our sole discretion. 
                Upon termination, your license to use the Game will immediately cease.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">
                7. Intellectual Property
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                All content in the Game, including but not limited to graphics, images, text, audio, 
                and code, is owned by us or our licensors and is protected by copyright, trademark, 
                and other intellectual property laws. You may not use any content from the Game 
                without our prior written permission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">
                8. Disclaimers
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                THE GAME IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
                EITHER EXPRESS OR IMPLIED.
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>We do not guarantee uninterrupted or error-free gameplay</li>
                <li>We are not responsible for data loss or corruption</li>
                <li>Game features and content may change without notice</li>
                <li>We make no guarantees about the availability of virtual items</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">
                9. Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING OUT OF OR RELATED 
                TO YOUR USE OF THE GAME. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID 
                FOR IN-GAME PURCHASES IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">
                10. Governing Law
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the 
                State of Ohio, United States, without regard to its conflict of law provisions. 
                Any disputes arising under these Terms shall be resolved in the courts located 
                in Columbus, Ohio.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3 text-primary">
                11. Contact Information
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <div className="mt-3 p-4 bg-muted rounded-lg">
                <p className="text-foreground font-medium">CurbBall Support</p>
                <p className="text-muted-foreground">Email: support@curbball.com</p>
              </div>
            </section>

            <section className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                By using CurbBall, you acknowledge that you have read, understood, and agree to 
                be bound by these Terms of Service.
              </p>
            </section>
          </div>
        </div>

        <div className="text-center mt-6">
          <a
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
          >
            View Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
