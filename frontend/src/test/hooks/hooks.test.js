/**
 * Tests for custom hooks.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsync, useLocalStorage } from '../../hooks/index';

describe('useAsync Hook', () => {
  it('should have initial state', () => {
    const { result } = renderHook(() => useAsync());

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.execute).toBe('function');
  });

  it('should handle successful async function', async () => {
    const asyncFn = vi.fn().mockResolvedValue('success');

    const { result } = renderHook(() => useAsync());

    let returnedData;
    await act(async () => {
      returnedData = await result.current.execute(asyncFn);
    });

    expect(returnedData).toBe('success');
    expect(result.current.data).toBe('success');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle async function error', async () => {
    const error = new Error('Test error');
    const asyncFn = vi.fn().mockRejectedValue(error);

    const { result } = renderHook(() => useAsync());

    await act(async () => {
      try {
        await result.current.execute(asyncFn);
      } catch {
        // Expected error
      }
    });

    expect(result.current.error).toEqual(error);
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem.mockReturnValue(null);
  });

  it('should return initial value when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

    expect(result.current[0]).toBe('initialValue');
  });

  it('should return stored value when it exists', () => {
    localStorage.getItem.mockReturnValue(JSON.stringify('storedValue'));

    const { result } = renderHook(() => useLocalStorage('testKey', 'initialValue'));

    expect(result.current[0]).toBe('storedValue');
  });

  it('should update localStorage when value changes', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', 'initial'));

    act(() => {
      result.current[1]('newValue');
    });

    expect(localStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify('newValue'));
    expect(result.current[0]).toBe('newValue');
  });

  it('should handle objects', () => {
    const { result } = renderHook(() => useLocalStorage('testKey', { name: 'test' }));

    expect(result.current[0]).toEqual({ name: 'test' });

    act(() => {
      result.current[1]({ name: 'updated' });
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'testKey',
      JSON.stringify({ name: 'updated' })
    );
  });
});
