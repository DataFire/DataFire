set -e
echo "Version..."
./bin/datafire version > ./src/test/commands/version.txt

echo "Integrate..."
DATAFIRE_LOCATION="../../src" \
  ./bin/datafire integrate --name hacker_news \
  --openapi "https://raw.githubusercontent.com/DataFire/Integrations/master/integrations/generated/hacker_news/openapi.json" \
  > ./src/test/commands/integrate.txt

echo "List..."
./bin/datafire list -a > ./src/test/commands/list_all.txt
./bin/datafire list    > ./src/test/commands/list.txt

echo "Describe..."
./bin/datafire describe hacker_news  > ./src/test/commands/describe_hn.txt
./bin/datafire describe hacker_news/getItem > ./src/test/commands/describe_getItem.txt

echo "Call..."
./bin/datafire run hacker_news/getItem --input.itemID 444 > ./src/test/commands/call_getItem.txt

echo "Success"
