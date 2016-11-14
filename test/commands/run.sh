set -e
echo "List..."
datafire list -a > ./test/commands/list_all.txt
datafire list    > ./test/commands/list.txt

echo "Integrate..."
datafire integrate hacker_news > ./test/commands/integrate.txt

echo "Describe..."
datafire describe hacker_news  > ./test/commands/describe_hn.txt
datafire describe hacker_news -o getItem > ./test/commands/describe_getItem.txt
datafire describe hacker_news -o "GET /item/{itemID}.json" > ./test/commands/describe_getItem2.txt

echo "Call..."
datafire call hacker_news -o getItem --params.itemID 444 > ./test/commands/call_getItem.txt
datafire call hacker_news -o "GET /item/{itemID}.json" --params.itemID 444 > ./test/commands/call_getItem2.txt

echo "Running quickstart..."
cd examples/0.\ quickstart
datafire integrate hacker_news > /dev/null
datafire run getTopStory.js > ../../test/commands/quickstart.txt

echo "Running authentication..."
cd ../1.\ authentication
datafire integrate github > /dev/null
datafire run getUser.js > ../../test/commands/authentication.txt

echo "Running error_handling..."
cd ../2.\ error_handling
datafire integrate hacker_news > /dev/null
datafire run triggerError.js > ../../test/commands/error_handling.txt

echo "Success"
