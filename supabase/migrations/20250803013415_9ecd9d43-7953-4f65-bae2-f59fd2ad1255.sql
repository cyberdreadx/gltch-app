-- First, let's clean up duplicate profiles
-- Keep only the original profile that owns the 'gltch' community
DELETE FROM profiles 
WHERE bluesky_did = 'did:plc:jojviuurzay7wr3lwswro2w7' 
AND user_id != '86b7417f-4088-4937-aa3e-33c707f5017d';

-- Add a unique constraint to prevent future duplicates based on bluesky_did
ALTER TABLE profiles ADD CONSTRAINT unique_bluesky_did UNIQUE (bluesky_did);