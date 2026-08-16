import Spinner from './Spinner';

const ACCENT = '#f86635';

function PageLoader() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Spinner size={32} color={ACCENT} />
    </div>
  );
}

export default PageLoader;