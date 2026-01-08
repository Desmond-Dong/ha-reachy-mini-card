# Installation Module Architecture

## 📁 Structure

```
installation/
├── constants.js              # Configuration and constants
├── helpers.js                # Pure utility functions
├── useInstallationPolling.js # Polling hook
├── useInstallationLifecycle.js # Main lifecycle hook
└── README.md                 # This documentation
```

## 🎯 Architecture

### Separation of Concerns

1. **constants.js** - Centralized configuration
   - Job types (`install`, `remove`)
   - Result states (`success`, `failed`, `in_progress`)
   - Timings and delays
   - Log patterns (success/error)

2. **helpers.js** - Pure and testable functions
   - Job lookup
   - Status detection
   - Log analysis
   - Timing calculations
   - List presence verification

3. **useInstallationPolling.js** - Polling logic
   - Polling management to wait for app appearance
   - Polling control (start/stop)
   - Timeout management

4. **useInstallationLifecycle.js** - Main orchestration
   - Job progress tracking
   - Completion detection
   - Result determination
   - Minimum timing management
   - Result display and closing

## 🔄 Execution Flow

### 1. Start
```
User clicks "Install"
  → handleInstall() [useAppHandlers]
    → lockForInstall() [store]
      → installingAppName = appName
      → installJobType = 'install'
      → installStartTime = Date.now()
    → installApp() [API call]
      → Returns job_id
```

### 2. Progress Tracking
```
useInstallationLifecycle effect:
  → Find job in activeJobs
  → Mark job as seen (first time)
  → Check if job is finished:
    - job.status === 'completed' || 'failed'
    - OR job removed from activeJobs (after being seen)
```

### 3. Result Detection
```
Priority order:
  1. Explicit status (high confidence)
     - job.status === 'completed' → success
     - job.status === 'failed' → failed
  
  2. Log analysis (medium confidence)
     - Success patterns in logs → success
     - Error patterns in logs → failed
  
  3. Default assumption (low confidence)
     - Job disappeared cleanly → success (with warning)
```

### 4. Timing Management
```
Calculate remaining minimum display time:
  - Install: 0ms (no minimum)
  - Remove: 4000ms (4s minimum)
  
Wait remaining time if > 0
```

### 5. Polling (install only)
```
For successful install:
  → Start polling (500ms interval, max 30 attempts = 15s)
  → Check if app appears in installedApps list
  → Refresh apps list every 2s (4 attempts)
  
  If app found:
    → Show success → Close after 3s
  
  If timeout:
    → Show success anyway (with warning) → Close after 3s
```

### 6. Result Display
```
Show result state:
  → setInstallResult('success' | 'failed')
  → Wait RESULT_DISPLAY_DELAY (3s)
  → unlockInstall() → Close overlay
  → Show toast notification
  → Close discover modal (if install success)
```

## 📊 States and Transitions

### Store States
- `installingAppName` - App name in progress
- `installJobType` - Type: 'install' or 'remove'
- `installResult` - Result: null, 'success', 'failed'
- `installStartTime` - Start timestamp
- `jobSeenOnce` - Flag: job seen at least once
- `processedJobs` - Array of already processed jobs

### Transitions
```
IDLE → INSTALLING → COMPLETED/FAILED → IDLE
```

## ⚙️ Configuration

### Timings (constants.js)
```javascript
TIMINGS = {
  MIN_DISPLAY_TIME: {
    INSTALL: 0,        // No minimum
    REMOVE: 4000,     // 4s minimum
  },
  RESULT_DISPLAY_DELAY: 3000,  // 3s before closing
  POLLING: {
    INTERVAL: 500,              // Check every 500ms
    MAX_ATTEMPTS: 30,           // 30 attempts = 15s max
    REFRESH_INTERVAL: 4,        // Refresh every 4 attempts (2s)
  },
}
```

## 🧪 Testability

### Helpers (pure functions)
All functions in `helpers.js` are pure and testable:
- No external dependencies
- No side effects
- Clear Input/Output

### Test Example
```javascript
import { determineInstallationResult } from './helpers';

test('should detect success from explicit status', () => {
  const job = { status: 'completed' };
  const result = determineInstallationResult(job);
  expect(result.wasCompleted).toBe(true);
  expect(result.confidence).toBe('high');
});
```

## 🔍 Points of Attention

### 1. Protection Against Infinite Loops
- `processedJobs` array to avoid re-processing the same job
- `jobSeenOnce` flag to avoid false positives

### 2. Timeout Management
- Polling timeout: 15s max
- If timeout, show success anyway (with warning)
- This prevents blocking UX in case of network delay

### 3. Result Confidence
- **High**: Explicit status
- **Medium**: Log analysis
- **Low**: Default assumption (with warning)

### 4. Cleanup
- All timeouts are cleaned up on unmount
- Polling stopped if installation cancelled
- No memory leaks

## 📝 Future Improvements

1. **Better user feedback**
   - Display polling status ("Waiting for app to appear...")
   - Indicate remaining attempts

2. **Improved error handling**
   - Don't assume success by default
   - Log more information for debug

3. **Dynamic configuration**
   - Allow adjusting timings based on context
   - A/B testing of delays

4. **Metrics**
   - Track average installation time
   - Track success/failure rates
