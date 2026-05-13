-- Reset listings data so marketplace can be repopulated from scratch
-- Includes related transactional data and listing media files.

delete from public.listings;
-- NOTE: Supabase blocks direct SQL deletion from storage.objects.
-- Clean up files in the "listings" bucket via Storage API/UI after this migration.
