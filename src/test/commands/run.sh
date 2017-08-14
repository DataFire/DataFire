set -e
echo "Version..."
./bin/datafire version > ./src/test/commands/output/version.txt

echo "Integrate..."
DATAFIRE_LOCATION="../../src" \
  ./bin/datafire integrate --name hacker_news \
  --openapi "https://raw.githubusercontent.com/DataFire/Integrations/master/integrations/generated/hacker_news/openapi.json" \
  > ./src/test/commands/output/integrate.txt

DATAFIRE_LOCATION="../../src" \
  ./bin/datafire integrate --name xkcd \
  --raml "https://raw.githubusercontent.com/raml-apis/XKCD/master/api.raml" \
  > ./src/test/commands/output/integrate2.txt

echo "List..."
./bin/datafire list -a > ./src/test/commands/output/list_all.txt
./bin/datafire list    > ./src/test/commands/output/list.txt

echo "Describe..."
./bin/datafire describe hacker_news  > ./src/test/commands/output/describe_hn.txt
./bin/datafire describe hacker_news/getItem > ./src/test/commands/output/describe_getItem.txt

echo "Call..."
./bin/datafire run hacker_news/getItem --input.itemID 444 > ./src/test/commands/output/call_getItem.txt

echo "Success"
