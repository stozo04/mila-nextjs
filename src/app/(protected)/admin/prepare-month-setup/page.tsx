import { notFound } from 'next/navigation';
import { authorizeAdmin } from '@/utils/supabase/server';
import PasswordSetup from './PasswordSetup';

export default async function PrepareMonthSetupPage() {
  if (await authorizeAdmin() instanceof Response) notFound();
  return <PasswordSetup />;
}
