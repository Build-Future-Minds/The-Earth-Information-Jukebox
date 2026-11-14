# Working together

## Branches and reviews

- `main` always runs. Branch as `role/short-task`, for example `sa/extract-frames`.
- Small pull requests. One other person reviews before merge. Students review too.
- Commit messages say what changed and why, in one line.

## Privacy

Two team members are minors. In the repo, commits, sample data, screenshots and demo recordings:

- No full names, ages, schools, photos, voices or contact details of students.
- Use role labels (Student A, Student B) or first initials.
- Set your git name and email to something you are happy to make public before your first commit:
  `git config user.name "Student A"` and use a GitHub no-reply email.
- Demo video: hands and screen only.

## Files

- Keep your clone outside OneDrive, iCloud, Dropbox and other synced folders.
- NASA frames and videos go in `assets/frames/` (git-ignored). Commit only small crops needed by the app.
- Anything synthetic must say so in its filename or first line: `MOCK` or `TEST INPUT`.

## Claims

- Tag statements in docs as **Verified** (with a link), **Design choice**, or **Unverified**.
- Never write a result we did not measure. If a test was not run, say so.
- Mappings are design choices. Do not describe them as what Earth sounds like.

## Changing the contract

`contracts/*.schema.json` is shared. Post the proposed change to the team, get a yes from
Developer A and Developer B, bump `schema_version`, then update the mock fixtures in the same pull request.
