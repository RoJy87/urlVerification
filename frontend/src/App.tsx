import { useState, useCallback, useEffect } from 'react';
import JobForm from './components/JobForm';
import JobList from './components/JobList';
import JobDetail from './components/JobDetail';
import { useJobStore } from './store/useJobStore';

export default function App() {
  const [toast, setToast] = useState<string | null>(null);
  const error = useJobStore((s) => s.error);
  const stopPolling = useJobStore((s) => s.stopPolling);

  const handleError = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 5000);
  }, []);

  useEffect(() => {
    if (error) {
      setToast(error);
      setTimeout(() => setToast(null), 5000);
    }
  }, [error]);

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return (
    <>
      <header className="app-header">
        <div className="app-header-logo">&#9670;</div>
        <h1>URL Verifier</h1>
        <span className="app-header-subtitle">
          Async URL health checker
        </span>
      </header>

      <div className="app-layout">
        <aside className="app-sidebar">
          <JobForm onError={handleError} />
          <JobList />
        </aside>

        <main className="app-main">
          <JobDetail />
        </main>
      </div>

      {toast && (
        <div className="toast-error">
          <span>{toast}</span>
          <button className="toast-close" onClick={() => setToast(null)}>
            &times;
          </button>
        </div>
      )}
    </>
  );
}
