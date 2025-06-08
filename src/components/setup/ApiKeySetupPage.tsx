
import OpenAIKeySetup from "@/components/OpenAIKeySetup";
import AppHeader from "@/components/layout/AppHeader";

interface ApiKeySetupPageProps {
  onKeySet: () => void;
}

const ApiKeySetupPage = ({ onKeySet }: ApiKeySetupPageProps) => {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        title="Payee Classification System"
        description="Efficient file-based payee classification processing"
      />

      <main className="container px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <OpenAIKeySetup onKeySet={onKeySet} />
        </div>
      </main>
    </div>
  );
};

export default ApiKeySetupPage;
