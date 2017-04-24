set -e
echo "Version..."
./bin/datafire version > ./test/commands/version.txt

echo "List..."
./bin/datafire list -a > ./test/commands/list_all.txt
./bin/datafire list    > ./test/commands/list.txt

echo "Integrate..."
DATAFIRE_LOCATION="../../" \
  ./bin/datafire integrate --name hacker-news \
  --openapi "https://raw.githubusercontent.com/DataFire/Integrations/master/integrations/hacker-news/integration.json" \
  > ./test/commands/integrate.txt

echo "Describe..."
./bin/datafire describe hacker-news  > ./test/commands/describe_hn.txt
./bin/datafire describe hacker-news/getItem > ./test/commands/describe_getItem.txt

echo "Call..."
./bin/datafire run hacker-news/getItem --input.itemID 444 > ./test/commands/call_getItem.txt

echo "Success"
