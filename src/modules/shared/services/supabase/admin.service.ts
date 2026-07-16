import { supabase } from './supabaseClient';

export async function validateAdmin(name: string, password: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admins')
    .select('id')
    .eq('name', name)
    .eq('password', password)
    .single();

  if (error || !data) return false;
  return true;
}
