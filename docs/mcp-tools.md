# BYOKIYB MCP tool schema

MCP tools must never return raw credential values.

## `request_secret`
Input: `project`, `provider`, `keyName`, `destination`, `ttlSeconds`.
Output: `requestId`, `localUrl`, `expiresAt`, `status`, `rawValueReturned: false`.

## `check_secret_available`
Input: `requestId` or `project` + `keyName`.
Output: `provider`, `keyName`, `destination`, `status`, `present`, `fingerprint`, `rawValueReturned: false`.

## `list_secret_metadata`
Input: `project`.
Output: array of safe metadata records only.

## `revoke_secret_request`
Input: `requestId`.
Output: safe metadata with `status: revoked` unless already written.
