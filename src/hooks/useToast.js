import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const showToast = useCallback((msg, type = "info") => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ msg, type });
    timeoutRef.current = setTimeout(() => setToast(null), 1200);
  }, []);

  return { toast, showToast };
}
