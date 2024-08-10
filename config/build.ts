import { defineConfig } from 'tsup'

export const build = () => defineConfig({
  entry: {
    index: "src/index.ts",
  },
  format: ["cjs", "esm"],
  target: "node14.21.3",
  clean: true,
  minify: false,
  dts: true,
  outDir: "dist",
})

