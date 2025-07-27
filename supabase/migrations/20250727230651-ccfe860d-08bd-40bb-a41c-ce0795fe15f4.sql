-- Fix function search path security warnings by adding search_path setting
ALTER FUNCTION public.auto_join_feed_community() SET search_path = '';
ALTER FUNCTION public.update_community_member_count() SET search_path = '';