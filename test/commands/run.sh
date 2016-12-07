set -e
echo "List..."
datafire list -a > ./test/commands/list_all.txt
datafire list    > ./test/commands/list.txt

echo "Integrate..."
datafire integrate hacker-news > ./test/commands/integrate.txt

echo "Describe..."
datafire describe hacker-news  > ./test/commands/describe_hn.txt
datafire describe hacker-news -o getItem > ./test/commands/describe_getItem.txt
datafire describe hacker-news -o "GET /item/{itemID}.json" > ./test/commands/describe_getItem2.txt

echo "Call..."
datafire call hacker-news -o getItem --params.itemID 444 > ./test/commands/call_getItem.txt
datafire call hacker-news -o "GET /item/{itemID}.json" --params.itemID 444 > ./test/commands/call_getItem2.txt

echo "Running quickstart..."
cd examples/0.\ quickstart
datafire integrate hacker-news > /dev/null
datafire run getTopStory.js > ../../test/commands/quickstart.txt

echo "Success"
