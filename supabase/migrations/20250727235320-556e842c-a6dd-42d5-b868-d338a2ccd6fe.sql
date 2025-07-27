-- Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    display_name, 
    bluesky_handle, 
    bluesky_did,
    is_gltch_native,
    bluesky_access_jwt,
    bluesky_refresh_jwt
  )
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'display_name',
    NEW.raw_user_meta_data ->> 'bluesky_handle',
    NEW.raw_user_meta_data ->> 'bluesky_did',
    COALESCE((NEW.raw_user_meta_data ->> 'is_gltch_native')::boolean, false),
    NEW.raw_user_meta_data ->> 'bluesky_access_jwt',
    NEW.raw_user_meta_data ->> 'bluesky_refresh_jwt'
  );
  RETURN NEW;
END;
$$;