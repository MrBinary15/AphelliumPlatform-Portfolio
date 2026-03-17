import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { getAuthUser } from '@/utils/auth';
import { isAdmin as checkIsAdmin } from '@/utils/roles';
import UsuariosClient from './UsuariosClient';

export default async function UsuariosPage() {
  const auth = await getAuthUser();
  if (!auth) redirect('/admin/login');

  const isAdmin = checkIsAdmin(auth.role);
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, created_at')
    .order('created_at', { ascending: false });

  return (
    <UsuariosClient
      profiles={profiles || []}
      currentUserId={auth.user.id}
      isAdmin={isAdmin}
    />
  );
}
