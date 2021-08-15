const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const path = require('path');
const outputPath = path.resolve(__dirname, 'dist');

module.exports = {
	mode: 'development',
	entry: {
		editor: `${__dirname}/client/js/editor.ts`,
		docs: `${__dirname}/client/js/docs.ts`,
		index: `${__dirname}/client/js/index.ts`,
	},
	output: {
		path: `${__dirname}/client/js/dist`,
		filename: '[name].js',
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: 'ts-loader',
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
			{
				test: /\.ttf$/,
				use: ['file-loader'],
			},
		],
	},
	resolve: {
		extensions: ['.ts', '.js'],
	},
	plugins: [
		new MonacoWebpackPlugin({
			languages: [],
		}),
	],
	devServer: {
		contentBase: outputPath,
		watchContentBase: true,
	},
};
