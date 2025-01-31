import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import babel from 'vite-plugin-babel';

declare module '@remix-run/node' {
  interface Future {
    v3_singleFetch: true;
  }
}

export default defineConfig({
  plugins: [
    babel({
      filter: /\.[jt]sx?$/,
      babelConfig: {
        presets: ['@babel/preset-typescript'], // if you use TypeScript
        plugins: [
          [
            'babel-plugin-react-compiler',
            {
              target: '18',
            },
          ],
        ],
      },
    }),
    remix({
      future: {
        v3_fetcherPersist: true,
        v3_relativeSplatPath: true,
        v3_throwAbortReason: true,
        v3_singleFetch: true,
        v3_lazyRouteDiscovery: true,
      },
      ssr: false,
    }),
    tsconfigPaths(),
  ],
  ssr: {
    // Bundle `problematic-dependency` into the server build
    noExternal: ['@mui/**'],
  },
});
