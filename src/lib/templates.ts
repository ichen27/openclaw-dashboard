export type TaskTemplate = {
  id: string;
  name: string;
  icon: string;
  title: string;
  description: string;
  requirements: string;
  priority: string;
};

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: "bug-fix",
    name: "Bug Fix",
    icon: "\uD83D\uDC1B",
    title: "[Bug] ",
    description:
      "## Bug Description\nDescribe the bug and its impact.\n\n## Steps to Reproduce\n1. \n2. \n3. \n\n## Expected Behavior\n\n\n## Actual Behavior\n",
    requirements:
      "- [ ] Identify root cause\n- [ ] Write failing test\n- [ ] Implement fix\n- [ ] Verify fix resolves the issue\n- [ ] Check for regressions",
    priority: "high",
  },
  {
    id: "feature",
    name: "Feature",
    icon: "\u2728",
    title: "[Feature] ",
    description:
      "## Overview\nDescribe the feature and its purpose.\n\n## User Story\nAs a [user], I want [capability] so that [benefit].\n\n## Acceptance Criteria\n",
    requirements:
      "- [ ] Design implementation approach\n- [ ] Implement core functionality\n- [ ] Add error handling\n- [ ] Write tests\n- [ ] Update documentation",
    priority: "medium",
  },
  {
    id: "research",
    name: "Research",
    icon: "\uD83D\uDD0D",
    title: "[Research] ",
    description:
      "## Research Goal\nWhat question are we trying to answer?\n\n## Context\nWhy is this research needed?\n\n## Scope\nWhat should be investigated?",
    requirements:
      "- [ ] Gather relevant information\n- [ ] Analyze findings\n- [ ] Document conclusions\n- [ ] Share recommendations",
    priority: "low",
  },
  {
    id: "infrastructure",
    name: "Infrastructure",
    icon: "\uD83D\uDD27",
    title: "[Infra] ",
    description:
      "## Objective\nDescribe the infrastructure change.\n\n## Impact\nWhat systems/services are affected?\n\n## Rollback Plan\nHow to revert if something goes wrong?",
    requirements:
      "- [ ] Plan the change\n- [ ] Test in staging\n- [ ] Implement change\n- [ ] Verify systems are healthy\n- [ ] Monitor for issues",
    priority: "high",
  },
];
