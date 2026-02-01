import { useState, useCallback } from 'react';

export function useAsync() {
  const [state, setState] = useState({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(async (asyncFunction) => {
    setState({ data: null, isLoading: true, error: null });
    try {
      const data = await asyncFunction();
      setState({ data, isLoading: false, error: null });
      return data;
    } catch (error) {
      setState({ data: null, isLoading: false, error });
      throw error;
    }
  }, []);

  return { ...state, execute };
}
