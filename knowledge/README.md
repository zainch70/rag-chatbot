# Company knowledge (admin)

Put approved company/product PDF files in this folder, then seed them into the database:

```bash
npm run knowledge:seed
```

Requirements:

- Files must end with `.pdf`
- Max size per file: 25 MB
- Re-running the seed replaces any existing system document with the same filename

End users do not upload files. Chat retrieves only from these seeded system documents.
