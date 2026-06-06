---
type: community
cohesion: 0.29
members: 12
---

# Bank Linking Routes

**Cohesion:** 0.29 - loosely connected
**Members:** 12 nodes

## Members
- [[AsyncSession_4]] - code - backend/app/routes/bank_links.py
- [[BankLinkRequest]] - code - backend/app/routes/bank_links.py
- [[ProviderAccountOut]] - code - backend/app/schemas.py
- [[Removes a linked bank account.]] - rationale - backend/app/routes/bank_links.py
- [[Retrieves all linked bank accounts for the current user.]] - rationale - backend/app/routes/bank_links.py
- [[Simulates the callback from a provider like Plaid Link.     Creates a new linke]] - rationale - backend/app/routes/bank_links.py
- [[User_5]] - code - backend/app/routes/bank_links.py
- [[bank_links.py]] - code - backend/app/routes/bank_links.py
- [[get_linked_accounts()]] - code - backend/app/routes/bank_links.py
- [[link_bank_account()]] - code - backend/app/routes/bank_links.py
- [[remove_linked_account()]] - code - backend/app/routes/bank_links.py
- [[str_6]] - code - backend/app/routes/bank_links.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Bank_Linking_Routes
SORT file.name ASC
```

## Connections to other communities
- 5 edges to [[_COMMUNITY_User & Subscription]]
- 4 edges to [[_COMMUNITY_Payment & Banking Models]]
- 2 edges to [[_COMMUNITY_Core Expense & Group Models]]
- 1 edge to [[_COMMUNITY_Auth & Notification Layer]]

## Top bridge nodes
- [[BankLinkRequest]] - degree 6, connects to 3 communities
- [[ProviderAccountOut]] - degree 6, connects to 2 communities
- [[AsyncSession_4]] - degree 6, connects to 2 communities
- [[User_5]] - degree 6, connects to 2 communities
- [[str_6]] - degree 4, connects to 2 communities