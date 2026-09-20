create table if not exists waitlist (
  id         integer primary key autoincrement,
  email      text not null unique,
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
