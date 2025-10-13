# Faceplate App Bug Reports - Index

📋 **Total Bugs Found**: 6  
⏱️ **Estimated Fix Time**: ~60 minutes  
📁 **Total Documentation**: ~1,200 lines

## Quick Navigation

| Document | Purpose | Lines |
|----------|---------|-------|
| [README.md](README.md) | Overview and quick fixes | 127 |
| [SUMMARY.md](SUMMARY.md) | Root cause analysis | 181 |
| [GITHUB-ISSUES.md](GITHUB-ISSUES.md) | Ready-to-use issue templates | 296 |
| BUG-001 to BUG-006 | Individual bug reports | 572 |

## Bugs at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│                    BUG SEVERITY BREAKDOWN                   │
├─────────────────────────────────────────────────────────────┤
│ 🔴 CRITICAL (1)                                             │
│    └─ BUG-003: Two-way binding broken                       │
│                                                              │
│ 🟠 HIGH (3)                                                  │
│    ├─ BUG-002: Metadata not cleared in undo/redo            │
│    ├─ BUG-004: Container hierarchies broken                 │
│    └─ BUG-005: Shallow clone causes shared state            │
│                                                              │
│ 🟡 MEDIUM (1)                                                │
│    └─ BUG-001: Duplicate onMounted hooks                    │
│                                                              │
│ 🟢 LOW (1)                                                   │
│    └─ BUG-006: Inconsistent componentId logging             │
└─────────────────────────────────────────────────────────────┘
```

## Root Causes

### 1. ID vs Name Confusion (50% of bugs)
Components identified by both IDs and names, code mixes them inconsistently.

**Affected**: BUG-003, BUG-004, BUG-006

### 2. Shallow Cloning (33% of bugs)
History manager uses shallow spread operator for complex objects.

**Affected**: BUG-002, BUG-005

### 3. Code Organization (17% of bugs)
Multiple lifecycle hooks of the same type.

**Affected**: BUG-001

## Fix Priority

```
1. BUG-003 → 5 min  ⚡ CRITICAL: Fixes two-way binding
2. BUG-004 → 5 min  ⚡ HIGH: Fixes containers
3. BUG-005 → 30 min 🔨 HIGH: Deep cloning (needs testing)
4. BUG-002 → 10 min 🔧 HIGH: Metadata clearing
5. BUG-001 → 5 min  📝 MEDIUM: Code cleanup
6. BUG-006 → 5 min  💄 LOW: Consistency fix
────────────────────
Total:      60 min
```

## Files Affected

```
src/apps/faceplate-builder/
├── FaceplateBuilderApp.vue ......... BUG-001
├── composables/
│   └── useHistoryManager.ts ........ BUG-002, BUG-005
└── components/
    └── FaceplateRuntime.vue ........ BUG-003, BUG-004, BUG-006
```

## How to Use These Reports

### For Developers
1. Read [SUMMARY.md](SUMMARY.md) for root cause analysis
2. Pick a bug from the priority list above
3. Read the individual bug report (BUG-XXX.md)
4. Apply the suggested fix
5. Test using scenarios in [README.md](README.md)

### For Project Managers
1. Use [GITHUB-ISSUES.md](GITHUB-ISSUES.md) to create issues
2. Assign based on priority and estimated time
3. Critical bug (BUG-003) should be fixed first
4. Consider bundling BUG-003, BUG-004, BUG-006 (same root cause)

### For QA/Testing
1. Use "Steps to Reproduce" in each bug report
2. After fixes, verify using test checklist in [README.md](README.md)
3. Pay special attention to:
   - Two-way binding with toggles
   - Nested containers (tabs, panels)
   - Undo/redo with complex components

## What's in Each Bug Report

Every bug report contains:
- ✅ Severity rating and impact assessment
- ✅ Exact file location and line numbers
- ✅ Current code snippet showing the bug
- ✅ Detailed explanation of the problem
- ✅ Expected behavior
- ✅ Suggested fix with code
- ✅ Impact analysis
- ✅ Steps to reproduce
- ✅ Related files

## Quick Fixes (One-Liners)

**BUG-003** (line 197):
```diff
- const componentBindings = allBindings.value.filter((b: any) => String(b.componentId) === String(slot.id));
+ const componentBindings = allBindings.value.filter((b: any) => b.component === slot.name);
```

**BUG-004** (line 190):
```diff
- const layoutItem = layout.find(item => item.component === String(slot.id));
+ const layoutItem = layout.find(item => item.component === slot.name);
```

**BUG-006** (line 211):
```diff
- componentId: String(slot.id),
+ componentId: slot.name,
```

## Testing Checklist

After applying fixes:
- [ ] Two-way binding works (toggle updates entity)
- [ ] Containers properly contain children
- [ ] Undo/redo restores all state
- [ ] No double initialization
- [ ] Debug logs show component names

## Statistics

- **Lines of Documentation**: 1,176
- **Number of Code Fixes**: 6
- **Files to Modify**: 3
- **Average Bug Report Length**: 95 lines
- **Longest Report**: BUG-005 (151 lines)
- **Shortest Report**: BUG-003 (67 lines)

## Next Steps

1. ✅ Bug reports completed
2. ⏳ Create GitHub issues from templates
3. ⏳ Assign issues to developers
4. ⏳ Apply fixes in priority order
5. ⏳ Test and verify fixes
6. ⏳ Close issues after verification

---

📝 **Note**: All bug reports are ready to be converted into separate GitHub issues using the templates provided in [GITHUB-ISSUES.md](GITHUB-ISSUES.md).
