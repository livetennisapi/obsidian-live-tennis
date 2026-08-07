#!/bin/sh
# Truth-pin checks: fail when stale Live Tennis API facts reappear in the repo.
# CHANGELOG.md is exempt (its entries describe history), as is this script.
set -u

fail=0

files() {
	git ls-files | grep -vE '^(CHANGELOG\.md|package-lock\.json|scripts/truthcheck\.sh)$'
}

forbid() {
	matches=$(files | xargs grep -riEn "$1" 2>/dev/null)
	if [ -n "$matches" ]; then
		echo "truthcheck: forbidden pattern ($2):"
		echo "$matches"
		fail=1
	fi
}

# Stale quota copy (grid changed 2026-08-06: FREE 100/day, BASIC 1,000/day).
forbid '100,?000[^0-9].{0,30}(day|daily)|100k.{0,30}(day|daily)' 'stale 100k daily quota'
forbid 'free[^.|]{0,60}(1,?000|1k)[^0-9][^.|]{0,20}(day|daily)' 'stale free-tier 1k/day quota'
# Wrong canonical URLs and identities.
forbid 'livetennisapi\.com/docs' 'wrong docs URL — use docs.livetennisapi.com'
forbid 'bensynapse' 'personal account — use the livetennisapi org identity'
# The daily reset is an absolute instant in resets_at, not midnight UTC.
forbid 'midnight utc' 'daily reset is not midnight UTC'

# Required copy while the README states quotas at all.
if git grep -qiE 'requests per day|/day' -- README.md; then
	if ! git grep -qE '100 requests per day|100 requests/day|100/day' -- README.md; then
		echo 'truthcheck: README states quotas but not the FREE tier 100/day figure'
		fail=1
	fi
	if ! git grep -q 'docs\.livetennisapi\.com' -- README.md; then
		echo 'truthcheck: README is missing the docs.livetennisapi.com link'
		fail=1
	fi
fi

if [ "$fail" -eq 0 ]; then
	echo 'truthcheck: OK'
fi
exit "$fail"
