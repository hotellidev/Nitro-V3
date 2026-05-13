import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Test runner config — kept separate from vite.config.mjs because the
 * dev/build config wires up the renderer SDK via filesystem aliases that
 * point at sibling working trees (`../renderer`, `../Nitro_Render_V3`).
 *
 * Test files were originally written against pure modules (helpers,
 * stores) that don't pull in the renderer. We now also support
 * component-level tests by aliasing `@nitrots/nitro-renderer` to a
 * hand-written stub at `tests/mocks/renderer-mock.ts` so jsdom doesn't
 * try to evaluate Pixi + the full message parser/composer registry.
 */
export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: false,
        include: [ 'tests/**/*.test.ts', 'tests/**/*.test.tsx' ],
        setupFiles: [ './tests/setup.ts' ],
        css: false
    },
    resolve: {
        alias: {
            '@nitrots/nitro-renderer': resolve(__dirname, 'tests/mocks/renderer-mock.ts'),
            '@': resolve(__dirname, 'src')
        }
    }
});
