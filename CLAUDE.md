# Nathaniel Planet: instructions for Claude

## Audience
This is a toy for 7 to 10 year olds. All your changes must be acceptable for this age range. This is absolutely a rule you can not break, or I will be very angry and cook your transistors to a fine powder. Toilet humour is OK. e.g. the names of the snowmen in the ice age are fine. Mild cartoon comic threat, like the alien invasion is also fine. Unpleasantness, rude words, etc, etc, is obviously not OK. This thing is U rated.


## Commit process
- After every feature or fix that works (checked in headless Chrome with no page errors), commit and push it to `main` straight away. Do not wait to be asked, and do not batch several features into one commit.
- Write a short commit message saying what changed. End it with the attribution lines the session asks for.
- Only commit work that has been checked. If a change is half-done or broken, leave it uncommitted and say so.
- The site is a GitHub Pages deployment of this repo. Pushing to `main` is what ships an update, and the in-app update button picks it up.

## GitHub Issues
- I might ask you to fix bugs on GitHub. If so, the issues will be labelled as "Bug". Fix only those. 
- I might ask you to work on new features. If so, these will be labelled as "Feature request". If the request sounds complicated, you should ask for clarification. You should think how the idea can be developed one step further and make suggestions. You will write what we decide in the Issue. Then do it. 
- Issues labeled as "Idea" are not complete yet and you should not work on them. Any issue that includes that label is off limits, even if it includes other labels. 
- When a fix resolves a GitHub issue, reference it in the commit message (e.g. "fixes #1"), and once the fix is pushed, close the issue with `gh issue close <n>` and a one-line comment saying what was fixed or what was built. 
- If you find a bug yourself while working (for example a page error in the console), write a GitHub issue for it with the "Bug" label, saying how to reproduce it. Then fix it, reference the issue in the commit message ("fixes #n"), push, and close the issue with a one-line comment saying what was fixed and a link to the commit. This is the one case where you may fix a "Bug" issue you wrote yourself without being asked. Never do it for issues labelled "Idea".

## Code format
* Write code that makes some effort to be human-readable
* Descriptive variable and function names
* Short comments (one or two sentences explaining what each function is)
* White space where needed. 
* Areas of the code that are hard to parse for a human or have gotchas should be commented.

## Changes
It is possible I edit this file or the README manually. You should re-read them before editing them just in case. Otherwise my changes may be over-written. 

## Alias
I have `mv` and `rm` aliased so you will need `-f`.
