# Security Policy

## Supported versions

Security fixes are currently provided for the latest tagged release and the `main` branch.

| Version | Supported |
|---|---|
| 0.1.x | Yes |
| Older or untagged builds | No |

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability.

Use GitHub's **Security → Report a vulnerability** flow for this repository. Include:

- the affected version or commit;
- the relevant component and trust boundary;
- reproducible steps or a minimal proof of concept;
- realistic impact and required attacker access;
- any suggested mitigation.

Do not include real credentials, private datasets, personal media, or destructive payloads. You should receive an acknowledgement within seven days. Coordinated disclosure timelines will depend on severity and fix complexity.

## Security model

ARGUS Studio is a local desktop application. Its FastAPI sidecar binds to loopback and requires a random per-launch token. The renderer is sandboxed, has no Node integration, and reaches native capabilities only through a narrow preload bridge. This reduces exposure but does not make untrusted local files safe by default; treat imported media, labels, JSON, YAML, and training outputs as untrusted input.

See [docs/SECURITY.md](docs/SECURITY.md) for the release audit and accepted limitations.
