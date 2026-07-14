import path from 'node:path'
import {defineConfig, type UserConfigExport} from '@tarojs/cli'
import tailwindcss from 'tailwindcss'
import type {Plugin} from 'vite'
import {UnifiedViteWeappTailwindcssPlugin as uvtw} from 'weapp-tailwindcss/vite'

import devConfig from './dev'
import lintConfig from './lint'
import prodConfig from './prod'

const base = String(process.argv[process.argv.length - 1])
const publicPath = process.env.PUBLIC_PATH || (base.startsWith('http') ? base : '/')

/**
 * BUG FIX [2026-07-14]: Taro 4.1.10 @tarojs/vite-runner 在 H5 生产构建时,
 * 会把 tabBar iconPath 硬编码为 `/static/images/{basename}`,没有读取 publicPath,
 * 导致部署到 GitHub Pages 等带子路径的场景下图标 404。
 * 上游 issue: https://github.com/NervJS/taro/issues/18324
 *
 * Workaround: 生产构建 bundle 生成阶段, 扫描所有 chunk code,
 * 把字符串引号内的 `/static/images/` 替换为 `<publicPath>/static/images/`。
 * 仅在 h5 生产构建启用, 且当 publicPath 有实际前缀时才替换。
 */
function fixTabbarIconPublicPath(rawPublicPath: string): Plugin {
  // 去掉尾斜杠, 得到诸如 `/legal-assistant`
  const prefix = rawPublicPath.replace(/\/+$/, '')
  return {
    name: 'fix-tabbar-icon-public-path',
    apply: 'build',
    generateBundle(_options, bundle) {
      // publicPath 为根路径或空时无需替换, 早退出
      if (!prefix) return
      const pattern = /(['"`])\/static\/images\//g
      const replacement = `$1${prefix}/static/images/`
      for (const fileName of Object.keys(bundle)) {
        const file = bundle[fileName]
        if (file.type === 'chunk' && typeof file.code === 'string' && file.code.includes('/static/images/')) {
          file.code = file.code.replace(pattern, replacement)
        }
      }
    }
  }
}

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'vite'>(async (merge) => {
  const baseConfig: UserConfigExport<'vite'> = {
    projectName: 'taro-vite',
    date: '2025-8-25',
    designWidth: 375,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [
      '@tarojs/plugin-generator',
      'miaoda-taro-plugin-html'
    ],
    alias: {
      '@': path.resolve(__dirname, '../src'),
      // 小程序场景使用微信polyfill版本supabase-js
      '@supabase/supabase-js': process.env.TARO_ENV === 'h5' ? '@supabase/supabase-js' : 'supabase-wechat-js'
    },
    defineConstants: {
      'process.env.TARO_APP_SUPABASE_URL': JSON.stringify(process.env.TARO_APP_SUPABASE_URL || ''),
      'process.env.TARO_APP_SUPABASE_ANON_KEY': JSON.stringify(process.env.TARO_APP_SUPABASE_ANON_KEY || ''),
      'process.env.TARO_APP_APP_ID': JSON.stringify(process.env.TARO_APP_APP_ID || ''),
    },
    copy: {
      patterns: [
        {
          from: 'src/assets/icons/',
          to: 'dist/assets/icons/',
        },
      ],
      options: {}
    },
    framework: 'react',
    compiler: {
      type: 'vite',
      vitePlugins: [
        {
          // 通过 vite 插件加载 postcss,
          name: 'postcss-config-loader-plugin',
          config(config) {
            // 加载 tailwindcss
            if (typeof config.css?.postcss === 'object') {
              config.css?.postcss.plugins?.unshift(tailwindcss())
            }
          }
        },
        uvtw({
          // rem转rpx
          rem2rpx: {
            rootValue: 24,
            propList: ['*'],
            transformUnit: 'rpx'
          } as any,
          cssChildCombinatorReplaceValue: ['view', 'text', 'button'],
          // 除了小程序这些，其他平台都 disable
          disabled: process.env.TARO_ENV === 'h5',
          // 由于 taro vite 默认会移除所有的 tailwindcss css 变量，所以一定要开启这个配置，进行css 变量的重新注入
          injectAdditionalCssVarScope: true
        }),
        // 仅 H5 构建注入 tabBar 图标路径修复插件, 不影响 mini 构建
        ...(process.env.TARO_ENV === 'h5' ? [fixTabbarIconPublicPath(publicPath)] : [])
      ] as Plugin[]
    },
    mini: {
      // 禁止将图片转换为 base64，确保图片作为独立文件输出
      imageUrlLoaderOption: {
        limit: 0
      },
      fontUrlLoaderOption: {
        limit: 0
      },
      mediaUrlLoaderOption: {
        limit: 0
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {
            baseFontSize: 12,
            minRootSize: 12
          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    },
    h5: {
      publicPath,
      assetsPublicPath: process.env.PUBLIC_PATH || '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash].js',
        chunkFilename: 'js/[name].[chunkhash].js',
      } as any,
      router: {
        mode: 'hash'  // hash 路由避免 GitHub Pages 刷新 404
      },

      sassLoaderOption: {
        additionalData: `@use "@/styles/overrides.scss";`
      },

      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {
            baseFontSize: 12,
            minRootSize: 12
          }
        },
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      devServer: {
        open: false
      }
    }
  }

  if (process.env.LINT_MODE === 'true') {
    return merge({}, baseConfig, lintConfig)
  }

  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }

  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
