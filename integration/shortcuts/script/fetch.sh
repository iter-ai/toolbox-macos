#!/bin/bash

# fetch.sh
#   Fetches an unsigned iCloud shortcut and converts it to JSON
#
#   Example:
#     ./fetch.sh 5f73812607d7441c83f2be5fb215920f

# download the binary plist file
curl -s "https://www.icloud.com/shortcuts/api/records/$1" | jq -r '.fields.shortcut.value.downloadURL' | xargs -n 1 curl -L -o "template/$1.shortcut"
# convert the binary plist to xml plist
plutil -convert xml1 "template/$1.shortcut"
