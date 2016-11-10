set -e
datafire list -a
datafire list

datafire integrate hacker_news
datafire describe hacker_news
datafire describe hacker_news -o getItem
datafire describe hacker_news -o "GET /item/{itemID}.json"

datafire call hacker_news -o getItem --params.itemID 444
datafire call hacker_news -o "GET /item/{itemID}.json" --params.itemID 444
