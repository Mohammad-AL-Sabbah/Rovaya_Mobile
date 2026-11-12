
import { Redirect } from 'expo-router';
import { useAuth } from '@/auth/auth-context';

export default function Index() {
  const { status } = useAuth();

  if (status === 'loading') {
    return null;
  }

  if (status === 'authenticated') {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/welcome" />;
}
