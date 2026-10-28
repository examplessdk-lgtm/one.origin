import { createMiddleware } from '@tanstack/react-start';
import { agentResponse } from './agent-http.js';

export const agentContentMiddleware = createMiddleware({ type: 'request' }).server(
  ({ request, next, handlerType }) => agentResponse(request, next, handlerType, async (pathname) => {
    // Use the generated route tree, including future dynamic routes. Match only:
    // no loaders, authentication checks, or user data requests are executed.
    const { getRouter } = await import('@/router');
    const router = getRouter();
    const [, params, foundRoute] = router.getMatchedRoutes(pathname);
    return !foundRoute || params['**'] !== undefined;
  }),
);
