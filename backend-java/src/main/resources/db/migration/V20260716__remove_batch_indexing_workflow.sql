-- Remove obsolete batch workflow artifacts while keeping indexing job tracking.

ALTER TABLE IF EXISTS indexing_jobs DROP CONSTRAINT IF EXISTS fk_indexing_jobs_batch;
DROP TABLE IF EXISTS batches;

ALTER TABLE IF EXISTS indexing_jobs DROP COLUMN IF EXISTS batch_id;
ALTER TABLE IF EXISTS images DROP COLUMN IF EXISTS batch_id;
ALTER TABLE IF EXISTS images DROP COLUMN IF EXISTS index_job_id;
