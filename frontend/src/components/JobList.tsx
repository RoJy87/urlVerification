import { useEffect } from 'react';
import { useJobStore } from '../store/useJobStore';
import type { JobSummary } from '../types';

const STATUS_LABELS: Record<JobSummary['status'], string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function truncateId(id: string): string {
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

interface JobCardProps {
  job: JobSummary;
  isActive: boolean;
  onClick: () => void;
}

function JobCard({ job, isActive, onClick }: JobCardProps) {
  return (
    <div
      className={`job-card${isActive ? ' active' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className="job-card-id">{truncateId(job.id)}</span>
      <div className="job-card-info">
        <span className={`badge badge-${job.status}`}>
          {STATUS_LABELS[job.status]}
        </span>
        <div className="job-card-date">{formatDate(job.createdAt)}</div>
      </div>
      <div className="job-card-stats">
        <span className="job-card-stat success">{job.successCount} ok</span>
        <span className="job-card-stat error">{job.errorCount} err</span>
      </div>
    </div>
  );
}

export default function JobList() {
  const jobs = useJobStore((s) => s.jobs);
  const activeJobId = useJobStore((s) => s.activeJobId);
  const fetchJobs = useJobStore((s) => s.fetchJobs);
  const setActiveJob = useJobStore((s) => s.setActiveJob);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return (
    <div className="job-list">
      <div className="section-header">Jobs</div>
      {jobs.length === 0 ? (
        <div className="job-list-empty">
          <div className="job-list-empty-icon">&#9741;</div>
          <div>No jobs yet</div>
          <div>Create one above to get started</div>
        </div>
      ) : (
        jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            isActive={job.id === activeJobId}
            onClick={() => setActiveJob(job.id)}
          />
        ))
      )}
    </div>
  );
}
