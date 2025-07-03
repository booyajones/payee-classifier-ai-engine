
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-white py-6 mb-6">
        <div className="container px-4">
          <h1 className="text-2xl font-bold">About the Payee Classification System</h1>
          <p className="opacity-90">
            Understanding the technology and methodology behind our classification engine
          </p>
        </div>
      </header>

      <main className="container px-4 pb-8">
        <div className="flex justify-end mb-6">
          <Button asChild variant="outline">
            <Link to="/">Return to Classification Tool</Link>
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">System Overview</h2>
            <p className="text-lg mb-4">
              The Payee Classification System automatically categorizes payee names as either businesses or individuals
              using a multi-tiered classification approach. This classification is critical for financial reporting,
              regulatory compliance, and data analysis.
            </p>
            <p className="mb-4">
              Our system employs a cascading architecture that progressively applies more sophisticated techniques
              as needed, balancing accuracy with processing efficiency.
            </p>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Classification Architecture</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Tier 1: Rule-Based</CardTitle>
                  <CardDescription>Fast, No API costs</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Legal entity suffix detection</li>
                    <li>Business keyword identification</li>
                    <li>Individual name pattern recognition</li>
                    <li>Professional title identification</li>
                    <li>Government entity detection</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tier 2: NLP-Based</CardTitle>
                  <CardDescription>Medium, Local Processing</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Named Entity Recognition</li>
                    <li>Probabilistic name parsing</li>
                    <li>Context-sensitive pattern matching</li>
                    <li>Linguistic structure analysis</li>
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tier 3: AI-Assisted</CardTitle>
                  <CardDescription>Advanced, External API</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Advanced pattern recognition</li>
                    <li>Structured reasoning</li>
                    <li>Edge case handling</li>
                    <li>Confidence assessment</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator className="my-8" />

          <section className="mb-8">
            <h2 className="text-2xl font-bold mb-4">Confidence Scoring System</h2>
            <p className="mb-4">
              Our confidence scoring framework provides a numeric score (0-100) representing the reliability of each classification:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2 text-confidence-high">High Confidence (90-100)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Clear business identifiers</li>
                  <li>Unambiguous individual patterns</li>
                  <li>Strong entity recognition</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2 text-confidence-medium">Medium Confidence (75-89)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Business keywords without legal entity identifiers</li>
                  <li>Somewhat ambiguous name patterns</li>
                  <li>Multiple possible interpretations</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2 text-confidence-low">Low Confidence (60-74)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Conflicting indicators</li>
                  <li>Unusual patterns or abbreviations</li>
                  <li>Requires contextual information</li>
                </ul>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2 text-confidence-verylow">Very Low Confidence (&lt;60)</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Highly ambiguous</li>
                  <li>Insufficient information</li>
                  <li>Requires human review</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-muted py-4 text-center text-sm text-muted-foreground">
        <div className="container">
          <p>Payee Classification System &copy; {new Date().getFullYear()}</p>
        </div>
      </footer>
    </div>
  );
};

export default About;
