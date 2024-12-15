import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
    input: 'sidepanel/index.js', // Your main JavaScript file
    output: {
        file: 'dist/sidepanel.bundle.js', // Output file for the bundled code
        format: 'iife', // Immediately Invoked Function Expression format for browser use
    },
    plugins: [
        resolve(),  // Resolves node_modules imports
        commonjs(), // Converts CommonJS modules to ES6
    ],
};