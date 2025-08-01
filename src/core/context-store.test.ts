// src/core/context-store.test.ts

import { ContextStore } from './context-store';

describe('ContextStore', () => {
  let store: ContextStore;

  beforeEach(() => {
    store = new ContextStore();
    // console.log를 모킹하여 테스트 출력이 깨끗하게 유지되도록 합니다.
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should be created with an empty context', () => {
    expect(store.getAll()).toEqual({});
  });

  test('should set and get a value', () => {
    store.set('key1', 'value1');
    expect(store.get('key1')).toBe('value1');
  });

  test('should update an existing value', () => {
    store.set('key1', 'initialValue');
    store.set('key1', 'updatedValue');
    expect(store.get('key1')).toBe('updatedValue');
  });

  test('should get all context data', () => {
    store.set('key1', 'value1');
    store.set('key2', 123);
    store.set('key3', true);

    const allContext = store.getAll();
    expect(allContext).toEqual({
      key1: 'value1',
      key2: 123,
      key3: true,
    });
  });

  test('should return undefined for a non-existent key', () => {
    expect(store.get('nonExistentKey')).toBeUndefined();
  });

  test('should handle different value types', () => {
    store.set('aString', 'hello');
    store.set('aNumber', 42);
    store.set('aBoolean', false);
    store.set('anObject', { nested: 'value' });
    store.set('anArray', [1, 2, 3]);

    expect(store.get('aString')).toBe('hello');
    expect(store.get('aNumber')).toBe(42);
    expect(store.get('aBoolean')).toBe(false);
    expect(store.get('anObject')).toEqual({ nested: 'value' });
    expect(store.get('anArray')).toEqual([1, 2, 3]);
  });

  test('should delete a value', () => {
    store.set('key1', 'value1');
    expect(store.get('key1')).toBe('value1');
    const result = store.delete('key1');
    expect(result).toBe(true);
    expect(store.get('key1')).toBeUndefined();
  });

  test('should clear all values', () => {
    store.set('key1', 'value1');
    store.set('key2', 'value2');
    store.clear();
    expect(store.getAll()).toEqual({});
  });
});
