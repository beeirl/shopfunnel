# Agent Guidelines

## General Approach

- Prefer the smallest correct change.
- Prefer modifying existing code in place over introducing new helpers.
- Do not create helper functions that are only called once unless extraction clearly improves readability, captures a real domain concept, or is reused.
- Do not introduce one-off helper variables for values that are used once and remain readable inline.
- Avoid wrapper helpers that only rename a short expression or a single function call.
- Match the surrounding file's style and level of abstraction. Do not refactor nearby code into helpers unless needed for the task.

## Package Manager

- Use `bun`.
- Install dependencies with `bun add package@latest --exact`.

## Type Checking

- Run `bunx tsc --noEmit`.
- Ignore errors from `.sst/platform/`; they are pre-existing and not part of the project source.

## Do Not Run

- Database migrations (`drizzle-kit push/migrate`)
- Tinybird deployments (`tb push`, `tb deploy`, etc.)
- SST deployments (`sst deploy`, `sst dev`, etc.)
- Edit or regenerate `routeTree.gen.ts`; TanStack Router manages it

## Web Package

### React

- Use React 19 patterns only.
- Do not use `forwardRef`; use `ref` as a regular prop instead.
- Do not use `useContext`; use `use(Context)` instead.
- Always import React as `import * as React from 'react'`.

### Imports

- Always use the `@` path alias for local imports.
- Never use barrel files or `index.ts` re-export imports.
- Import directly from the source file.

### Icons

- Use `@tabler/icons-react`.
- Alias icon imports with the `Icon` suffix.

### UI Components

- Use shadcn/ui components from `@/components/ui`.
- Components are built on Base UI, not Radix.
- Use render props such as `Dialog.Trigger render={<Button />}` instead of `asChild`.

### Styling

- Use Tailwind CSS v4.
- Use the design tokens defined in `packages/web/src/styles.css`.
- Prefer semantic tokens like `bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, `bg-primary`, and `text-primary-foreground` over hardcoded colors.

### Server Functions

- Create server functions with `createServerFn` from `@tanstack/react-start`.
- Do not suffix server function names with `Fn`.
