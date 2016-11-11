node_modules/babel-cli/bin/babel.js *.js --presets babel-preset-es2015 --out-dir distribution --bundle
node_modules/babel-cli/bin/babel.js lib/*.js --presets babel-preset-es2015 --out-dir distribution --bundle
node_modules/babel-cli/bin/babel.js commands/*.js --presets babel-preset-es2015 --out-dir distribution --bundle
node_modules/babel-cli/bin/babel.js native_integrations/*.js --presets babel-preset-es2015 --out-dir distribution --bundle
cp native_integrations/*.json distribution/native_integrations/

cat .gitignore > .npmignore
echo "!distribution/" >> .npmignore
