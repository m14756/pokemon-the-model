import FileUpload from '../components/FileUpload';

const HomePage = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-30" />
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-electric-500/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-electric-600/10 rounded-full blur-[128px]" />
      </div>
      
      <FileUpload />
    </div>
  );
};

export default HomePage;
