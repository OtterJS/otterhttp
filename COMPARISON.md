# Comparison

Below there is a table comparing otterhttp, [tinyhttp](https://tinyhttp.v1rtl.site), [Express](https://expressjs.com) 
and [polka](https://github.com/lukeed/polka).

| criteria                             | otterhttp |      tinyhttp      |     express v4     |  polka  |
|--------------------------------------|:---------:|:------------------:|:------------------:|:-------:|
| Minimum supported Node.js version    |     ?     |      14.21.3       |       0.10.0       |  6.0.0  |
| Minimum supported ECMAScript version |     ?     |       ES2019       |      ES5 (?)       |   ES5   |
| `req` / `res` extensions             |     ?     | :heavy_check_mark: | :heavy_check_mark: |   :x:   |
| Test coverage                        |     ?     |        96%         |        100%        |  100%   |
| Compiled to native ESM               |     ?     | :heavy_check_mark: |        :x:         |   :x:   |
| TypeScript support                   |     ?     | :heavy_check_mark: |        :x:         |   :x:   |
| Package size (core only)             |     ?     |       76.2kB       |       208 kB       | 25.5 kB |
| Built-in middlewares                 |     ?     |        :x:         | :heavy_check_mark: |   :x:   |

For the detailed performance report see
[benchmarks](https://web-frameworks-benchmark.netlify.app/compare?f=polka,tinyhttp,express)
