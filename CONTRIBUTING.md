# Contributing

## Local dev
```bash
npm i
npm test
npm run lint
```

## Homebridge
- Install via UI, or `npm i -g .` from the repo.
- Keep logs free of secrets.

## Release
- Bump version in `package.json`
- Update `CHANGELOG.md`
- `npm run lint`
- `npm test`
- `npm pack --dry-run`
- `npm publish`
