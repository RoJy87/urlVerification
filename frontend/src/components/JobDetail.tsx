import { useJobStore } from '../store/useJobStore';
import UrlResultItem from './UrlResultItem';

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function JobDetail() {
  const activeJob = useJobStore((s) => s.activeJob);
  const activeJobId = useJobStore((s) => s.activeJobId);
  const cancelJob = useJobStore((s) => s.cancelJob);

  if (!activeJobId) {
    return (
      <div className="detail-empty">
        <div className="detail-empty-icon">&#128269;</div>
        <div className="detail-empty-text">
          Select a job from the sidebar to view details
        </div>
      </div>
    );
  }

  if (!activeJob) {
    return (
      <div className="detail-loading">
        <div className="spinner" />
        Loading job details…
      </div>
    );
  }

  const total = activeJob.urls.length;
  const done = activeJob.urls.filter(
    (u) => u.status === 'success' || u.status === 'error' || u.status === 'cancelled'
  ).length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;
  const isFinal = ['completed', 'cancelled', 'failed'].includes(activeJob.status);
  const canCancel = !isFinal;

  return (
    <div>
      <div className="detail-header">
        <div className="detail-title-group">
          <div className="detail-title">
            Job {activeJob.id.slice(0, 8)}…
            <span className={`badge badge-${activeJob.status}`}>
              {activeJob.status.replace('_', ' ')}
            </span>
          </div>
          <div className="detail-meta">
            <span className="detail-meta-item">
              Created: {formatDate(activeJob.createdAt)}
            </span>
            <span className="detail-meta-item">
              {total} URL{total !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <div className="detail-actions">
          {canCancel && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => cancelJob(activeJob.id)}
            >
              Cancel Job
            </button>
          )}
        </div>
      </div>

      <div className="progress-section">
        <div className="progress-header">
          <span className="progress-label">Progress</span>
          <span className="progress-count">
            {done} / {total} processed
          </span>
        </div>
        <div className="progress-bar-track">
          <div
            className={`progress-bar-fill${progressPct === 100 ? ' complete' : ''}`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="url-list">
        <div className="url-list-title">
          URLs ({total})
        </div>
        {activeJob.urls.map((result, idx) => (
          <UrlResultItem key={`${result.url}-${idx}`} result={result} index={idx} />
        ))}
      </div>
    </div>
  );
}
