import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import CollectionPage from './pages/CollectionPage';
import CardDetailPage from './pages/CardDetailPage';
import useStore from './store/useStore';

function App() {
  const { initializeCards, isInitialized } = useStore();
  
  useEffect(() => {
    if (!isInitialized) {
      initializeCards();
    }
  }, [initializeCards, isInitialized]);
  
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-navy-900">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/collection" element={<CollectionPage />} />
            <Route path="/card/:cardId" element={<CardDetailPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
