set -e
datafire list -a > ./list_all.txt
datafire list    > ./list.txt

datafire integrate hacker_news > ./integrate.txt
datafire describe hacker_news  > ./describe_hn.txt
datafire describe hacker_news -o getItem > ./describe_getItem.txt
datafire describe hacker_news -o "GET /item/{itemID}.json" > ./describe_getItem2.txt

datafire call hacker_news -o getItem --params.itemID 444 > ./call_getItem.txt
datafire call hacker_news -o "GET /item/{itemID}.json" --params.itemID 444 > ./call_getItem2.txt

cd examples/quickstart
datafire integrate hacker_news
datafire run getTopStory.js > ./run.txt
