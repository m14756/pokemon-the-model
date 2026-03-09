import { Search, Upload, BarChart3 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  
  return (
    <header className="sticky top-0 z-50 glass-dark border-b border-white/5 pt-safe">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric-500 to-electric-600 flex items-center justify-center shadow-lg shadow-electric-500/25 group-hover:shadow-electric-500/40 transition-shadow">
              <span className="text-xl">⚡</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-display text-lg tracking-tight text-white">
                POKÉMON
              </h1>
              <p className="text-[10px] font-heading tracking-[0.3em] text-electric-400 -mt-1">
                THE MODEL
              </p>
            </div>
          </Link>
          
          {/* Navigation */}
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                location.pathname === '/'
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Upload size={18} />
              <span className="hidden sm:inline text-sm font-medium">Upload</span>
            </Link>
            
            <Link
              to="/collection"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                location.pathname === '/collection' || location.pathname.startsWith('/card/')
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <BarChart3 size={18} />
              <span className="hidden sm:inline text-sm font-medium">Collection</span>
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
