---
description: How to create a new Skill or Workflow for this project
---

# Create a New Project Skill/Workflow

Use this workflow when you identify a repetitive task, a complex architectural pattern, or a critical technical decision that should be documented and automated.

## Steps

1. **Identify the Pattern**
   - Is it a bug fix that happened twice? 
   - Is it a new technical service (like a storage helper)?
   - Is it a specific UI component layout?

2. **Update skills.md**
   - Add a high-level summary of the knowledge to [skills.md](file:///c:/Users/PA_91/Documents/Coding/ANTIGRAVITY/2BEFITHUB/skills.md).
   - Link to the specific workflow you are about to create.

3. **Create the Workflow File**
   - Create a new file in `.agent/workflows/[skill-name].md`.
   - Follow the required format:
     ```markdown
     ---
     description: [Short title]
     ---
     # [Goal]
     ... steps ...
     ```

4. **Add "Turbo" Annotations (Optional)**
   - If a step involves a `run_command` that is always safe (e.g., `npm test`, `ls`), add `// turbo` above it.
