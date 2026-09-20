-- Hourly live-score budget per visitor IP for the playground. Cache hits
-- (built-in samples) never reach the server and are not counted.
create table if not exists score_quota (
  ip text not null,
  window_start text not null,
  count integer not null default 0,
  primary key (ip, window_start)
);
