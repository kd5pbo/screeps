#!/bin/sh
#
# autoup.sh
# Script to automatically upload if there's changes
# By J. Stuart McMurray
# Created 20151213
# Last Modified 20151213

set -e

# Last uploaded time file
LASTUP=.lastup

while :; do
        # Make sure there's a last
        if ! [[ -f .lastup ]]; then
                /usr/bin/touch $LASTUP
        fi

        # Find files that have changed since the last upload
        FO=$(/usr/bin/find . -name '*.js' -newer $LASTUP -exec ls -ld {} +)
        # Upload if there's a change
        if [[ -n "$FO" ]]; then
                echo "$FO"
                /home/stuart/go/bin/screepssrc
                touch $LASTUP
        fi

        /bin/sleep 10
done

