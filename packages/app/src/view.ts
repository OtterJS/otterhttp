/*!
 * Originally ported from https://github.com/expressjs/express/blob/master/lib/view.js
 * express
 * Copyright(c) 2009-2013 TJ Holowaychuk
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014-2015 Douglas Christopher Wilson
 * MIT Licensed
 *
 * Forked from https://github.com/tinyhttp/tinyhttp/blob/68df0efdd930f0b6f4237c60e26c89e886067f02/packages/app/src/view.ts
 * tinyhttp
 * Copyright (c) 2020 v i r t l
 * MIT Licensed
 *
 * otterhttp
 * Copyright (c) 2024 Lordfirespeed
 * Lordfirespeed licenses the contents of this file to you under the terms of the LGPL-3.0-or-later license.
 */

import { statSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { isString, isStringArray } from './type-guards'
import type { TemplateEngine, TemplateEngineOptions } from './types.js'

function tryStat(path: string) {
  try {
    return statSync(path)
  } catch (e) {
    return undefined
  }
}

type Renderable<RenderOptions extends TemplateEngineOptions = TemplateEngineOptions> = Pick<
  (typeof View<RenderOptions>)['prototype'],
  'render'
>

export type IViewPrototype<RenderOptions extends TemplateEngineOptions = TemplateEngineOptions> = {
  new (...args: ConstructorParameters<typeof View<RenderOptions>>): Renderable<RenderOptions>
  prototype: Renderable<RenderOptions>
}

/**
 * Initialize a new `View` with the given `name`.
 *
 * Options:
 *
 *   - `defaultEngine` the default template engine name
 *   - `engines` template engine require() cache
 *   - `root` root path for view lookup
 *
 * @param name
 * @param options
 * @public
 */

export class View<RenderOptions extends TemplateEngineOptions = TemplateEngineOptions> {
  ext: string | undefined
  defaultEngine: string | undefined
  name: string
  engine: TemplateEngine<RenderOptions>
  path: string
  root: string[]

  constructor(
    name: string,
    opts: Partial<{
      defaultEngine: string
      root: string | string[]
      engines: Record<string, TemplateEngine<RenderOptions>>
    }> = {}
  ) {
    this.ext = extname(name)
    this.name = name
    this.root = opts.root == null ? [] : isString(opts.root) ? [opts.root] : opts.root
    this.defaultEngine = opts.defaultEngine

    if (!this.ext && !this.defaultEngine)
      throw new Error('No default engine was specified and no extension was provided.')

    let fileName = name

    if (!this.ext) {
      // get extension from default engine name
      this.ext = this.defaultEngine && this.defaultEngine[0] !== '.' ? `.${this.defaultEngine}` : this.defaultEngine

      fileName += this.ext
    }

    if (this.ext == null || !opts?.engines?.[this.ext]) throw new Error(`No engine was found for ${this.ext}`)

    this.engine = opts.engines[this.ext]
    this.path = this.#lookup(fileName)
  }

  #lookup(name: string): string {
    let path: string | undefined = undefined

    for (let i = 0; i < this.root.length && !path; i++) {
      const root = this.root[i]
      // resolve the path
      const loc = resolve(root, name)
      const dir = dirname(loc)
      const file = basename(loc)

      // resolve the file
      path = this.#resolve(dir, file)
    }

    if (!path) {
      const dirs =
        this.root.length > 1
          ? `directories "${this.root.slice(0, -1).join('", "')}" or "${this.root[this.root.length - 1]}"`
          : `directory "${this.root[0]}"`
      throw new Error(`Failed to lookup view "${name}" in views ${dirs}`)
    }

    return path
  }

  #resolve(dir: string, file: string) {
    const ext = this.ext

    // <path>.<ext>
    let path = join(dir, file)
    let stat = tryStat(path)

    if (stat?.isFile()) {
      return path
    }

    // <path>/index.<ext>
    path = join(dir, basename(file, ext), `index${ext}`)
    stat = tryStat(path)

    if (stat?.isFile()) {
      return path
    }
  }

  async render(options: RenderOptions, data: Record<string, unknown>): Promise<unknown> {
    return await this.engine(this.path, data, options)
  }
}
