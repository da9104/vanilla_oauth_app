const path = require('path')
const webpack = require('webpack')

module.exports = { 
 watchOptions: {
    ignored: /node_modules/,
  },
 entry: './src/app.js',
 mode: "development",
 devServer: {
    port: 8080, 
    static: './dist'
    //  directory: path.join(__dirname, './'),
  },
//   output: {
//     path: path.join(__dirname, "/public/dist"),
//     filename: "main.js",
//     path: path.resolve(__dirname, 'dist'),
//     clean: false
//   }
module: {
    rules: [
      {
        test: /\.(?:js|mjs|cjs)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: "defaults" }]
            ]
          }
        }
      },
      // {
      //   test: /\.scss$/,
      //   use: ["style-loader", "css-loader", "sass-loader"]
      // }
    ]
  },
}