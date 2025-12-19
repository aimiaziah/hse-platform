# Screenshot Guide for Master's Report
## Section 4.3.2 Backend API Integration

This guide will walk you through capturing all the necessary screenshots for your master's report.

---

## Prerequisites

### 1. Start the Development Server

Open terminal in your project directory and run:

```bash
npm run dev
```

Wait for the server to start (usually at `http://localhost:3000`)

### 2. Open Developer Tools

- **Chrome/Edge**: Press `F12` or `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox**: Press `F12` or `Ctrl+Shift+I`

---

## Screenshot Checklist

### ✅ 1. Project File Structure

**Purpose:** Show your API route organization

**Steps:**
1. Open File Explorer / VS Code Explorer
2. Navigate to `C:\Users\Aimi\Desktop\inspection-app\pwa-inspection\src\pages\api`
3. Expand folders to show:
   - `/api/ai/analyze-extinguisher.ts` (main AI endpoint)
   - `/api/inspections/`
   - `/api/supabase/`
   - Other API routes

**Screenshot Focus:**
- Clear folder hierarchy
- Highlight `analyze-extinguisher.ts`

**Filename:** `1-file-structure.png`

---

### ✅ 2. API Route Handler Code - Main Function

**Purpose:** Show the entry point and request validation

**Steps:**
1. Open `src/pages/api/ai/analyze-extinguisher.ts` in VS Code
2. Scroll to lines 49-84 (main handler function)
3. Ensure these sections are visible:
   - Function signature with TypeScript types
   - Request method validation (line 55-63)
   - Request body extraction (line 68)
   - Input validation (lines 76-84)

**Screenshot Focus:**
- Clear code formatting
- TypeScript type annotations visible
- Comments visible

**Filename:** `2-api-handler-main.png`

---

### ✅ 3. API Route Handler Code - Routing Logic

**Purpose:** Show multi-deployment architecture

**Steps:**
1. In the same file, scroll to lines 91-109
2. Ensure the switch statement is fully visible:
   ```typescript
   switch (DEPLOYMENT_TYPE) {
     case 'roboflow': ...
     case 'digitalocean': ...
     case 'gcp': ...
     case 'azure': ...
   }
   ```

**Screenshot Focus:**
- Complete switch statement
- Show flexibility in deployment options

**Filename:** `3-api-routing-logic.png`

---

### ✅ 4. Service Handler Example - DigitalOcean

**Purpose:** Show service-specific implementation

**Steps:**
1. Scroll to lines 206-254 (detectWithDigitalOcean function)
2. Ensure visible:
   - Function signature
   - Fetch request to AI service
   - Error handling
   - Response mapping

**Screenshot Focus:**
- Complete function implementation
- Error handling try-catch
- Data transformation logic

**Filename:** `4-service-handler-digitalocean.png`

---

### ✅ 5. TypeScript Type Definitions

**Purpose:** Show type safety implementation

**Steps:**
1. Open `src/types/ai-inspection.ts`
2. Capture the entire file or key interfaces:
   - `AIDetectionResult` (lines 3-8)
   - `AIInspectionResult` (lines 25-36)
   - `CapturedImage` (lines 38-42)

**Screenshot Focus:**
- Clear interface definitions
- Type annotations
- JSDoc comments if any

**Filename:** `5-typescript-types.png`

---

### ✅ 6. Detection Mapper Code - Main Function

**Purpose:** Show business logic transformation

**Steps:**
1. Open `src/utils/yoloDetectionMapper.ts`
2. Scroll to lines 24-50 (mapYOLOToInspectionResults function start)
3. Show:
   - Function signature
   - Data aggregation logic
   - Normalization step

**Screenshot Focus:**
- Clear data transformation logic
- Comments explaining the process

**Filename:** `6-detection-mapper-main.png`

---

### ✅ 7. Detection Mapper Code - Business Logic Example

**Purpose:** Show how YOLO detections are mapped to inspection fields

**Steps:**
1. In the same file, scroll to lines 50-72 (Shell condition logic)
2. Show:
   - Component detection grouping
   - Confidence threshold checks
   - Pass/fail logic
   - Reasoning generation

**Screenshot Focus:**
- Complete business logic for one component
- Conditional logic visible

**Filename:** `7-detection-mapper-logic.png`

---

### ✅ 8. Frontend Component - API Call

**Purpose:** Show frontend integration

**Steps:**
1. Open `src/components/AICameraCapture.tsx`
2. Scroll to lines 324-362 (confirmCapture function)
3. Show where it calls `onComplete(allCaptures)` which triggers API call

**Alternative:** If parent component makes the API call, show that instead

**Screenshot Focus:**
- How images are prepared for API call
- Data flow from UI to API

**Filename:** `8-frontend-api-integration.png`

---

## Live Application Screenshots

### ✅ 9. Browser Network Tab - Request

**Purpose:** Show actual API request in action

**Steps:**
1. Open your app in browser (`http://localhost:3000`)
2. Open Developer Tools → Network tab
3. Navigate to Fire Extinguisher inspection page
4. Start AI camera capture
5. Take 2 photos
6. Submit for AI analysis
7. In Network tab, find the request to `/api/ai/analyze-extinguisher`
8. Click on it → **Headers** tab

**Screenshot Focus:**
- Request URL
- Request Method (POST)
- Status Code (200)
- Request Headers

**Filename:** `9-network-request-headers.png`

---

### ✅ 10. Browser Network Tab - Request Payload

**Purpose:** Show request body structure

**Steps:**
1. Same network request as above
2. Click **Payload** tab
3. Expand the JSON to show:
   - `images` array with base64 data
   - `extinguisherInfo` object

**Screenshot Focus:**
- JSON structure (you can collapse base64 data for clarity)
- Show `images[0].stepId`, `images[0].timestamp`
- Show `extinguisherInfo` fully expanded

**Filename:** `10-network-request-payload.png`

---

### ✅ 11. Browser Network Tab - Response

**Purpose:** Show API response structure

**Steps:**
1. Same network request
2. Click **Response** tab
3. Show the JSON response:
   - `success: true`
   - `detections` array with multiple items
   - `processingTime`

**Screenshot Focus:**
- Pretty-printed JSON
- Show 2-3 detection objects fully expanded
- Show confidence scores and reasoning

**Filename:** `11-network-response.png`

---

### ✅ 12. Browser Console - Logging

**Purpose:** Show backend processing logs

**Steps:**
1. With Developer Tools open
2. Go to **Console** tab
3. Perform AI analysis again
4. Capture console logs showing:
   - `[AI Analysis API] Request received`
   - `[AI Analysis API] Processing X images`
   - `[YOLO Mapper] Raw detections`
   - `[YOLO Mapper] Final detections`
   - Processing time

**Screenshot Focus:**
- Clear log messages
- Processing flow visible
- Timestamps if available

**Filename:** `12-console-logging.png`

---

### ✅ 13. UI - AI Camera Capture

**Purpose:** Show user interface for image capture

**Steps:**
1. Open Fire Extinguisher inspection form
2. Click "Use AI Camera"
3. Capture screenshot showing:
   - Camera view with overlay
   - Capture button
   - Step indicator (1/2)
   - Instructions

**Screenshot Focus:**
- Full mobile camera interface
- Clear instructions visible

**Filename:** `13-ui-camera-capture.png`

---

### ✅ 14. UI - AI Results Display

**Purpose:** Show how AI results are presented to user

**Steps:**
1. After AI analysis completes
2. Capture the inspection form showing:
   - Auto-filled checkboxes (√/X)
   - Confidence indicators (if visible)
   - Fields that were detected by AI

**Screenshot Focus:**
- Clear form with AI-filled values
- Visual distinction of AI-filled fields

**Filename:** `14-ui-results-display.png`

---

## Testing & Validation Screenshots

### ✅ 15. Postman/Thunder Client - API Test (Optional)

**Purpose:** Show API can be tested independently

**Steps:**
1. Open Postman or Thunder Client (VS Code extension)
2. Create POST request to `http://localhost:3000/api/ai/analyze-extinguisher`
3. Add JSON body with sample data
4. Send request
5. Capture both request and response

**Screenshot Focus:**
- Request setup
- Response body
- Status code

**Filename:** `15-api-testing-tool.png`

---

### ✅ 16. Environment Configuration

**Purpose:** Show configuration management

**Steps:**
1. Open `.env.local` or `.env.example` file
2. Show relevant variables (hide sensitive values):
   ```
   AI_DEPLOYMENT_TYPE=roboflow
   AI_MIN_CONFIDENCE=0.5
   AI_TIMEOUT_MS=30000
   # ROBOFLOW_API_KEY=[hidden]
   ```

**Screenshot Focus:**
- Configuration options
- Comments explaining each variable

**Filename:** `16-environment-config.png`

---

### ✅ 17. Error Handling Example

**Purpose:** Show graceful error handling

**Steps:**
1. Manually trigger an error (e.g., disconnect internet or set invalid API key)
2. Try to perform AI analysis
3. Capture:
   - Network tab showing error status
   - UI showing error message to user
   - Console showing error logs

**Screenshot Focus:**
- User-friendly error message
- Technical error in console

**Filename:** `17-error-handling.png`

---

## Code Quality Screenshots

### ✅ 18. TypeScript Intellisense

**Purpose:** Show IDE support and type safety

**Steps:**
1. In VS Code, open `analyze-extinguisher.ts`
2. Hover over `AIInspectionResult` type
3. Capture the tooltip showing interface definition

**Screenshot Focus:**
- VS Code intellisense popup
- Type information clearly visible

**Filename:** `18-typescript-intellisense.png`

---

### ✅ 19. API Configuration Export

**Purpose:** Show Next.js API route configuration

**Steps:**
1. In `analyze-extinguisher.ts`
2. Scroll to lines 385-391 (export config)
3. Show:
   ```typescript
   export const config = {
     api: {
       bodyParser: {
         sizeLimit: '10mb',
       },
     },
   };
   ```

**Screenshot Focus:**
- Configuration for body size limits

**Filename:** `19-api-config.png`

---

## Creating Diagrams

### ✅ 20. Architecture Diagram

**Purpose:** Visual representation of system architecture

**Steps:**
1. Open `docs/4.3.2-backend-api-integration.md` (the file I just created)
2. Copy the ASCII architecture diagram
3. Use a tool to convert to visual diagram:
   - **Option 1:** Use https://asciiflow.com/
   - **Option 2:** Use draw.io / Lucidchart to recreate
   - **Option 3:** Use Mermaid (if your report supports it)

**Screenshot Focus:**
- Clear flow from Frontend → API → AI Service → Response
- All components labeled

**Filename:** `20-architecture-diagram.png`

---

### ✅ 21. Sequence Diagram

**Purpose:** Show request/response flow over time

**Steps:**
1. Use a tool like:
   - https://sequencediagram.org/
   - Mermaid Live Editor
   - PlantUML

2. Create diagram showing:
   ```
   User → Frontend: Capture images
   Frontend → API: POST /api/ai/analyze-extinguisher
   API → AI Service: Process images
   AI Service → API: Return detections
   API → Mapper: Transform data
   Mapper → API: Return inspection result
   API → Frontend: Return response
   Frontend → User: Display results
   ```

**Screenshot Focus:**
- Clear temporal flow
- All actors visible

**Filename:** `21-sequence-diagram.png`

---

## Performance Screenshots

### ✅ 22. Network Performance Timing

**Purpose:** Show actual performance metrics

**Steps:**
1. In Network tab of the AI analysis request
2. Click **Timing** tab
3. Show:
   - DNS lookup
   - Request sent
   - Waiting (TTFB)
   - Content download
   - Total time

**Screenshot Focus:**
- Timing breakdown
- Total request time

**Filename:** `22-performance-timing.png`

---

## Summary Table Screenshot

### ✅ 23. Summary Table

**Purpose:** Quick reference table for your report

**Steps:**
1. Open `docs/4.3.2-backend-api-integration.md`
2. Scroll to "11. Summary" section
3. Copy the component table into Excel or Word
4. Format nicely with colors
5. Screenshot the formatted table

**Or create in your report directly:**

| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| API Route Handler | `analyze-extinguisher.ts` | 49-391 | Main entry point, routing |
| Type Definitions | `ai-inspection.ts` | 1-77 | Type safety |
| Detection Mapper | `yoloDetectionMapper.ts` | 24-386 | Business logic |
| Frontend Component | `AICameraCapture.tsx` | 1-827 | User interface |

**Filename:** `23-summary-table.png`

---

## Quick Start Commands

To get all screenshots quickly:

```bash
# Terminal 1: Start the app
cd C:\Users\Aimi\Desktop\inspection-app\pwa-inspection
npm run dev

# Open browser to:
# http://localhost:3000

# Navigate to Fire Extinguisher form
# Open DevTools (F12)
# Go through the AI capture process
# Capture all Network tab screenshots
```

---

## Tips for Better Screenshots

1. **Use High Resolution:** Set browser zoom to 100% or use high DPI display
2. **Remove Sensitive Data:** Hide API keys, personal info
3. **Annotate:** Use a tool like Snagit or Windows Snipping Tool to add arrows/highlights
4. **Consistent Styling:** Use same theme (dark/light) throughout
5. **Clear Focus:** Crop to show only relevant parts
6. **File Organization:** Create a folder structure:
   ```
   screenshots/
   ├── 01-architecture/
   ├── 02-code/
   ├── 03-live-demo/
   ├── 04-testing/
   └── 05-diagrams/
   ```

---

## Checklist Summary

Print this and check off as you go:

- [ ] 1. File structure
- [ ] 2. API handler main function
- [ ] 3. Routing logic
- [ ] 4. Service handler example
- [ ] 5. TypeScript types
- [ ] 6. Detection mapper main
- [ ] 7. Detection mapper logic
- [ ] 8. Frontend integration
- [ ] 9. Network request headers
- [ ] 10. Network request payload
- [ ] 11. Network response
- [ ] 12. Console logging
- [ ] 13. Camera UI
- [ ] 14. Results display
- [ ] 15. API testing tool
- [ ] 16. Environment config
- [ ] 17. Error handling
- [ ] 18. TypeScript intellisense
- [ ] 19. API config
- [ ] 20. Architecture diagram
- [ ] 21. Sequence diagram
- [ ] 22. Performance timing
- [ ] 23. Summary table

---

## Need Help?

If you encounter issues:
1. Check if `npm run dev` is running
2. Clear browser cache
3. Open browser console for errors
4. Check Network tab for failed requests

Good luck with your master's report! 🎓
