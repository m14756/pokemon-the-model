import CardDetail from '../components/CardDetail';

const CardDetailPage = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-20" />
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-electric-500/10 rounded-full blur-[128px]" />
      </div>
      
      <CardDetail />
    </div>
  );
};

export default CardDetailPage;
