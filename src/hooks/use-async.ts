import { useCallback, useEffect, useState } from 'react';

type State<T> = { data: T | null; loading: boolean; error: unknown };

/**
 * تحميل بيانات غير متزامنة مع حالات: تحميل / خطأ / نجاح + reload.
 * label: يظهر في الـ terminal أثناء التطوير عند فشل الطلب (مع رمز الحالة ورسالة الخادم).
 */
export function useAsync<T>(fetcher: () => Promise<T>, label = 'request') {
  const [state, setState] = useState<State<T>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    fetcher().then(
      (data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      },
      (error: any) => {
        if (__DEV__) {
          console.warn(
            `[${label}] failed: kind=${error?.kind} status=${error?.status} message=${error?.serverMessage ?? error?.message}`
          );
        }
        if (!cancelled) setState({ data: null, loading: false, error });
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}