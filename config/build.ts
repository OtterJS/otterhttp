import { defineConfig } from 'tsup'

export const build = () =>
  defineConfig({
    entry: {
      index: 'src/index.ts'
    },
    format: ['esm'],
    target: 'node15',
    clean: true,
    minify: false,
    dts: true,
    outDir: 'dist'
  })
