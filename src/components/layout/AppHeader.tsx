
interface AppHeaderProps {
  title: string;
  description: string;
}

const AppHeader = ({ title, description }: AppHeaderProps) => {
  return (
    <header className="bg-primary text-white py-6 mb-6">
      <div className="container px-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="opacity-90">{description}</p>
      </div>
    </header>
  );
};

export default AppHeader;
