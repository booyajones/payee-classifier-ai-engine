
const AppFooter = () => {
  return (
    <footer className="bg-muted py-4 text-center text-sm text-muted-foreground">
      <div className="container">
        <p>Payee Classification System &copy; {new Date().getFullYear()}</p>
      </div>
    </footer>
  );
};

export default AppFooter;
