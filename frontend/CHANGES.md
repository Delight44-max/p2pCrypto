# VectorShift Frontend Assessment — Changes & Decisions

## Overview

This document explains every file that was created or modified, the reasoning behind each decision, and what would break if the change was not made.

---

## FRONTEND CHANGES

---

###  `frontend/src/nodes/BaseNode.js` — CREATED

**What it is:**
A shared base component that every node in the pipeline now extends. It handles the common visual shell: the coloured header, the body wrapper, and all input/output Handles with labels.

**Why it was created:**
The original four nodes (Input, Output, LLM, Text) each duplicated the same `<div>` wrapper, the same inline border style, and the same `Handle` rendering logic. Adding a fifth node would have meant copying that code again. The assessment explicitly asked for an abstraction that speeds up node creation and makes it easy to apply styles across all nodes at once.

**What the abstraction accepts:**

| Prop | Type | Purpose |
|------|------|---------|
| `id` | string | ReactFlow node ID, used to prefix Handle IDs |
| `title` | string | Displayed in the node header |
| `category` | string | Controls the header gradient colour |
| `inputs` | array | `[{ id, label }]` — rendered as target Handles on the left |
| `outputs` | array | `[{ id, label }]` — rendered as source Handles on the right |
| `minWidth` | number | Minimum node width in pixels |
| `style` | object | Additional inline styles for the node container |
| `children` | ReactNode | Node-specific form fields rendered in the body |

**What breaks without it:**
- Every new node requires 40–60 lines of repeated code
- Changing the node style (border-radius, shadow, header height) means editing every single node file
- Inconsistent visual design as nodes drift apart over time

---

### `frontend/src/nodes/nodes.css` — CREATED

**What it is:**
A single CSS file that defines the entire design system for all nodes. Covers the node shell, header gradients per category, form fields (inputs, selects, textareas), Handles, and Handle labels.

**Why it was created:**
The original nodes used inline `style={{}}` objects. Inline styles cannot use pseudo-selectors (`:hover`, `:focus`), cannot be overridden by a theme, and scatter design decisions across multiple files. A single CSS file makes the whole design changeable in one place.

**Key design decisions:**
- Each node category gets its own header gradient colour so nodes are instantly recognisable on the canvas
- `box-shadow` on `:hover` gives subtle interactivity feedback
- `transition` on inputs gives focus states that feel polished

**What breaks without it:**
- Nodes render with the original `border: '1px solid black'` — no visual hierarchy
- No hover or focus effects anywhere in the UI
- The BaseNode component references CSS class names that would not exist

---

### `frontend/src/nodes/inputNode.js` — MODIFIED

**What changed:**
I Replaced the raw `<div style={{border: '1px solid black'}}>` wrapper and manual `Handle` with `BaseNode`. Node-specific fields (Name and Type) are passed as `children`. Also added `updateNodeField` from the Zustand store so state is persisted to the global pipeline.

**What breaks without it:**
- Node ignores the shared design system
- Name and Type changes are not saved to the store, so they would be lost when the component re-renders

---

###  `frontend/src/nodes/outputNode.js` — MODIFIED

Same refactor as inputNode. Wrapped in `BaseNode` with `category="output"` (green header) and an input Handle on the left. State is now synced to the store.

---

### `frontend/src/nodes/llmNode.js` — MODIFIED

I Replaced the two manually-positioned target Handles and one source Handle with the `inputs`/`outputs` props on `BaseNode`. The positioning maths (e.g. `top: ${100/3}%`) is now handled automatically inside BaseNode for any number of handles.

**What breaks without it:**
- Adding a third input to the LLM node in future would require manually recalculating all handle positions

---

### `frontend/src/nodes/textNode.js` — MODIFIED (Part 1 + Part 3)

This file was the most significantly changed. Two features were added on top of the BaseNode refactor.

**Feature 1 — Auto-resize (height):**
A `useRef` points to the textarea element. On every text change, the height is reset to `'auto'` and then set to `scrollHeight`. This makes the textarea grow downward as the user types without a scrollbar.

**Feature 2 — Auto-resize (width):**
The longest line in the textarea is measured by character count. Width is computed as `max(220, longestLine * 7.5 + 60)` and capped at 500 px. This is stored in `nodeWidth` state and applied to the node container via `style={{ width: nodeWidth }}`.

**Feature 3 — Dynamic `{{ variable }}` Handles:**
A `useEffect` runs a regex (`/\{\{([a-zA-Z_$][a-zA-Z0-9_$]*)\}\}/g`) against the text on every change. It extracts valid JavaScript variable names. For each unique variable, a `Handle` of type `target` is rendered on the left side of the node with the variable name as its label. Handles are evenly spaced using the same formula as BaseNode.

**What breaks without it:**
- Text node stays 200×80 px regardless of content — text overflows invisibly
- No way to pipe data into specific parts of a text template — the whole point of the text node as a prompt builder is lost

---

### `frontend/src/nodes/filterNode.js` — CREATED

**What it does:** Routes data through a pass or fail output based on a condition string.  
**Demonstrates:** Two output handles from one input — shows BaseNode handles arbitrary handle counts cleanly.

---

###  `frontend/src/nodes/promptTemplateNode.js` — CREATED

**What it does:** Combines a role selector (system / user / assistant) with a free-text template to structure prompts for an LLM node.  
**Demonstrates:** Mixed field types (select + textarea) and the `inputs/outputs` props together.

---

###  `frontend/src/nodes/apiNode.js` — CREATED

**What it does:** Configures an outbound HTTP request — method (GET/POST/PUT/DELETE) and URL.  
**Demonstrates:** A practical integration node that shows the pipeline reaching outside the system.

---

###  `frontend/src/nodes/noteNode.js` — CREATED

**What it does:** A free-text annotation node with no handles. Used to leave comments on a pipeline canvas.  
**Demonstrates:** BaseNode works equally well with `inputs={[]}` and `outputs={[]}` — handles are fully optional.

---

### `frontend/src/nodes/mathNode.js` — CREATED

**What it does:** Applies a math operation (add, subtract, multiply, divide, modulo) to two inputs and outputs a result.  
**Demonstrates:** Two input handles and one output handle, with a select field for the operation.

---

### `frontend/src/ui.js` — MODIFIED

**What changed:**
I Imported and registered all five new node types in the `nodeTypes` map. Fixed the canvas height to `calc(100vh - 130px)` so it fills the viewport properly between the toolbar and submit bar. Also coloured the MiniMap nodes to match each node category's colour.

**What breaks without it:**
- Dropping a new node type onto the canvas would render nothing — ReactFlow silently ignores unregistered types
- The canvas height was `70vh` with a hardcoded `100wv` (typo for `vw`) which broke the full-width layout

---

### `frontend/src/toolbar.js` — MODIFIED

**What changed:**
Replaced the four hardcoded `DraggableNode` entries with a declarative `ALL_NODES` array. Adding a new node to the pipeline now only requires adding one object to this array — no JSX changes needed.

---

### `frontend/src/draggableNode.js` — MODIFIED

**What changed:**
I Added a `color` prop that feeds a CSS custom property (`--node-color`) to the coloured dot in each toolbar pill. Drag opacity feedback added (`onDragEnd` restores full opacity).

---

### `frontend/src/submit.js` — MODIFIED (Part 4)

**What changed:**
- I Added `useStore` to read the current `nodes` and `edges` from Zustand
- On click, sends a `POST` request to `http://localhost:8000/pipelines/parse` with `Content-Type: application/json`
- Validates that the pipeline is not empty before sending
- On success, shows an `alert` with `num_nodes`, `num_edges`, and a human-readable `is_dag` message
- On failure (network error or non-OK status), shows a helpful error alert

**What breaks without it:**
- The button does nothing — Part 4 of the assessment is completely incomplete
- The original file had no `onClick`, no `fetch`, and no store connection

---

### `frontend/src/index.css` — MODIFIED

**What changed:**
I Added the `DM Sans` Google Font import and complete styles for the toolbar, draggable node pills, and submit bar. Dark top and bottom bars (`#0F172A`) frame the light canvas, creating a product-quality layout.

---
