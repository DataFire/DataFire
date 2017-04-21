set -e
echo "Version..."
datafire version > ./test/commands/version.txt

echo "List..."
datafire list -a > ./test/commands/list_all.txt
datafire list    > ./test/commands/list.txt

echo "Integrate..."
DATAFIRE_LOCATION="../../" \
  datafire integrate --name hacker-news \
  --openapi "https://raw.githubusercontent.com/DataFire/Integrations/master/integrations/hacker-news/integration.json" \
  > ./test/commands/integrate.txt

echo "Describe..."
datafire describe hacker-news  > ./test/commands/describe_hn.txt
datafire describe hacker-news/getItem > ./test/commands/describe_getItem.txt

echo "Call..."
datafire run hacker-news/getItem --input.itemID 444 > ./test/commands/call_getItem.txt

echo "Success"
