import { inject, provide } from 'vue';

const CONTEXT_KEY = Symbol('AppContext');

export function createAppContext(container) {
  return {
    get(serviceName) {
      return container.get(serviceName);
    },
    container
  };
}

export function provideAppContext(context) {
  provide(CONTEXT_KEY, context);
}

export function useAppContext() {
  const ctx = inject(CONTEXT_KEY);
  if (!ctx) throw new Error('AppContext not provided');
  return ctx;
}
