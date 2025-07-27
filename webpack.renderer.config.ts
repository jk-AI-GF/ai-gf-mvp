import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

// Rule for global CSS files (e.g., index.css)
rules.push({
  test: /\.css$/,
  exclude: /\.module\.css$/, // Exclude CSS Modules from this rule
  use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
});

// Rule for CSS Modules (*.module.css files)
rules.push({
  test: /\.module\.css$/,
  use: [
    { loader: 'style-loader' },
    {
      loader: 'css-modules-typescript-loader', // To generate .d.ts files
    },
    {
      loader: 'css-loader',
      options: {
        modules: {
          // Use a more descriptive name in development for easier debugging
          localIdentName: '[name]__[local]__[hash:base64:5]',
        },
      },
    },
  ],
});

export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css'],
  },
};
