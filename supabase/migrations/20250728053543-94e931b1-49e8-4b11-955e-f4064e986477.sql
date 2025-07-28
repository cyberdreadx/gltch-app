-- Clear all user data to start fresh
-- Delete in order to avoid foreign key conflicts

-- Clear user-generated content first
DELETE FROM post_votes;
DELETE FROM notifications;
DELETE FROM user_communities;
DELETE FROM community_hashtags;
DELETE FROM communities;

-- Clear user profiles
DELETE FROM profiles;
DELETE FROM app_users;

-- Clear custom feeds
DELETE FROM custom_feeds;

-- Clear post engagement data
DELETE FROM post_engagement;