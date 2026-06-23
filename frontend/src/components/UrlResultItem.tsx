import type { UrlResult } from '../types';

const STATUS_LABELS: Record<UrlResult['status'], string> = {
  pending: 'Pending',
  in_progress: 'Checking',
  success: 'Success',
  error: 'Error',
  cancelled: 'Cancelled',
};

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return '';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

interface UrlResultItemProps {
  result: UrlResult;
  index: number;
}

export default function UrlResultItem({ result, index }: UrlResultItemProps) {
  const isHttpError = result.httpStatus !== undefined && result.httpStatus >= 400;

  return (
    <div
      className="url-item"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <span className="url-item-url" title={result.url}>
        {result.url}
      </span>

      <div className="url-item-details">
        <span className={`badge badge-${result.status}`}>
          {STATUS_LABELS[result.status]}
        </span>

        {result.httpStatus !== undefined && (
          <span className={`url-item-http${isHttpError ? ' error' : ' success'}`}>
            {result.httpStatus}
          </span>
        )}

        {result.error && result.status !== 'cancelled' && (
          <span className="url-item-error" title={result.error}>
            {result.error}
          </span>
        )}

        {result.durationMs !== undefined && (
          <span className="url-item-duration">
            {formatDuration(result.durationMs)}
          </span>
        )}
      </div>
    </div>
  );
}
