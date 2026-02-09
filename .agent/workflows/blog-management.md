---
description: Automated workflow for writing blogs, syncing data, and maintaining expert-level content standards.
---

# 🤖 Agentic Blog Management System

This workflow orchestrates three specialized "Agents" to maintain the Insurance Insight platform. Always follow these steps in sequence.

## 🏁 Step 1: The Expert Blog Writer Agent
*Objective: Create elite, human-like editorial content.*
1.  **Skill**: Activate `expert-blog-writer`.
2.  **Task**: Research and write a 1200-1500 word post.
3.  **Output**: A clean Markdown-formatted post with at least one Comparison Table and hierarchical headers.

## 🔄 Step 2: The Site Sync Expert Agent
*Objective: Data integrity and automation.*
1.  **Skill**: Activate `site-sync-expert`.
2.  **Task**: Append the new post to `data/posts.json` and ensure author/category IDs match.
3.  **Sync**: 
    // turbo
    Run the build script:
    ```powershell
    node "c:/Users/Seenu/Desktop/New folder (3)/scripts/build.js"
    ```
4.  **Verification**: Confirm `scripts/data.js` is updated.

## 🎨 Step 3: The UI/UX Pro Max Agent
*Objective: Visual excellence and rendering check.*
1.  **Skill**: Activate `ui-ux-pro-max`.
2.  **Task**: Verify the new content renders correctly in the UI. Ensure the Table of Contents, Author Card, and Related Posts are perfectly displayed.
3.  **Optimization**: If the new content requires special styling (e.g., custom table widths), update `styles/main.css`.

---
**CRITICAL**: Every new blog request MUST trigger this full "Agentic Chain". Do not skip steps.
