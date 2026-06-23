import { type FormEvent, type KeyboardEvent, useState } from 'react';
import { useJobStore } from '../store/useJobStore';

interface JobFormProps {
  onError?: (message: string) => void;
}

export default function JobForm({ onError }: JobFormProps) {
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const createJob = useJobStore((s) => s.createJob);

  const urls = input
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();

    if (urls.length === 0) {
      setFormError('Enter at least one URL');
      return;
    }

    if (urls.length > 100) {
      setFormError('Maximum 100 URLs per job');
      return;
    }

    setFormError(null);
    setSubmitting(true);

    try {
      await createJob(urls);
      setInput('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create job';
      setFormError(message);
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      const form = (e.target as HTMLTextAreaElement).form;
      form?.requestSubmit();
    }
  };

  return (
    <form className="job-form" onSubmit={handleSubmit}>
      <textarea
        className="job-form-textarea"
        placeholder={"example.com\nhttps://google.com\nhttp://localhost:8080"}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={submitting}
        spellCheck={false}
      />
      <div className="job-form-actions">
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Run Check'}
        </button>
        {urls.length > 0 && (
          <span className="job-form-hint">
            {urls.length} URL{urls.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {formError && <div className="job-form-error">{formError}</div>}
    </form>
  );
}
