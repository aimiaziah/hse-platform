import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function ReviewDetailPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to reviews list page since individual review viewing is handled via modal
    router.replace('/supervisor/reviews');
  }, [router]);

  return null;
}

