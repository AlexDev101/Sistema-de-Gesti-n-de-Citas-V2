create schema if not exists extensions;
drop extension if exists btree_gist;
create extension if not exists btree_gist with schema extensions;
