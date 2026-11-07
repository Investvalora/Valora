-- pg_trgm supports relocation; indexes retain references to its operator class.
set lock_timeout = '5s';
alter extension pg_trgm set schema extensions;
-- pg_net is non-relocatable. Its functions already live in net; do not drop
-- and recreate the extension merely to silence its installation-schema warning.
