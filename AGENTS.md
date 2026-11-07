# Sayfa project workflow

- The user requests that every completed source change be committed and pushed to `https://github.com/AliyevaNargiz/sayfa-digital-library.git`, including updated Markdown documentation and README files.
- Update the dated history in `README.md` when completing a change. Use verified dates (Asia/Baku for user-facing dates); never invent historical milestones or claim a check passed without evidence.
- Preserve the existing application and user data. Include all relevant source, tests, assets and documentation; keep runtime secrets, `.data`, `.wrangler`, private uploads, user records, tokens, dependencies and generated build output out of Git.
- Keep the Sites identity in `.openai/hosting.json` unchanged. In this workspace `origin` is the Sites source remote and `github` is the user's GitHub remote. Inspect remotes before pushing; a fresh GitHub clone may instead use `origin` for GitHub. Do not force-push or overwrite unrelated remote work.
- Use appropriate checks for code changes, update documentation, then commit and push the completed work to the user's repository. Documentation-only edits do not need a full application test rerun.
- GitHub source synchronization and Sites publication are separate. When publishing a website change, use the Sites workflow, push the exact source state to its native remote, and publish the matching saved version. A GitHub push alone does not deploy this website.
- This preference concerns source-code changes. Do not commit or publish visitors' personal book records or document files.
