set -e
npm run build
cat .gitignore > .npmignore
echo "!distribution/" >> .npmignore
npm publish
