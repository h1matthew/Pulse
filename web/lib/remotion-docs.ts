/**
 * Helper module for querying Remotion documentation
 * Used by Gemini function calling to get accurate API information
 */

// Key Remotion documentation that covers the most common APIs
// This serves as fallback when MCP is not available
const CORE_REMOTION_DOCS = `
## Remotion Core APIs

### useCurrentFrame()
Returns the current frame number (0-indexed). Call this hook at the top of your component.
\`\`\`javascript
import { useCurrentFrame } from 'remotion';
const frame = useCurrentFrame(); // Returns 0, 1, 2, ... durationInFrames-1
\`\`\`

### useVideoConfig()
Returns the video configuration object with width, height, fps, and durationInFrames.
\`\`\`javascript
import { useVideoConfig } from 'remotion';
const { width, height, fps, durationInFrames } = useVideoConfig();
\`\`\`

### interpolate(input, inputRange, outputRange, options?)
Maps a value from an input range to an output range. Essential for animations.

Parameters:
- input: number - The value to interpolate (usually frame)
- inputRange: number[] - The input range [start, end]
- outputRange: number[] - The output range [start, end]
- options?: { extrapolateLeft?: 'clamp' | 'extend', extrapolateRight?: 'clamp' | 'extend', easing?: EasingFunction }

\`\`\`javascript
import { useCurrentFrame, interpolate } from 'remotion';

const frame = useCurrentFrame();

// Fade in from frame 0 to 30
const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });

// Move from left to center
const translateX = interpolate(frame, [0, 60], [-200, 0], { extrapolateRight: 'clamp' });

// Scale up
const scale = interpolate(frame, [30, 60], [0.5, 1], {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp'
});
\`\`\`

### spring({ frame, fps, from?, to?, config?, delay?, durationInFrames? })
Creates spring-based animations for natural-feeling motion.

Parameters:
- frame: number - Current frame (use useCurrentFrame())
- fps: number - Frames per second (from useVideoConfig())
- from?: number - Initial value (default: 0) ⚠️ NOT "fromValue"!
- to?: number - End value (default: 1) ⚠️ NOT "toValue"!
- config?: { damping?: number, mass?: number, stiffness?: number, overshootClamping?: boolean }
  - damping: default 10, higher = less bouncy
  - mass: default 1, higher = slower
  - stiffness: default 100, higher = faster
  - overshootClamping: default false, if true prevents overshooting
- delay?: number - Frames to delay before starting
- durationInFrames?: number - Stretch animation to exact duration

\`\`\`javascript
import { useCurrentFrame, useVideoConfig, spring } from 'remotion';

const frame = useCurrentFrame();
const { fps } = useVideoConfig();

// Basic spring (0 to 1)
const scale = spring({ frame, fps });

// Animate from -200 to 500
const x = spring({
  frame,
  fps,
  from: -200,  // ✓ CORRECT: "from" not "fromValue"
  to: 500      // ✓ CORRECT: "to" not "toValue"
});

// Custom spring config with range
const bounce = spring({
  frame,
  fps,
  from: 0,
  to: 100,
  config: { damping: 5, stiffness: 200 }
});

// Delayed spring (starts at frame 30)
const delayedSpring = spring({
  frame,
  fps,
  delay: 30,
  config: { damping: 12 }
});
\`\`\`

⚠️ IMPORTANT: Use \`from\` and \`to\`, NOT \`fromValue\` and \`toValue\`!

### AbsoluteFill
A pre-styled div that fills the entire video frame. Use this as your root container.

\`\`\`javascript
import { AbsoluteFill } from 'remotion';

function MyComponent() {
  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a2e' }}>
      {/* Your content */}
    </AbsoluteFill>
  );
}
\`\`\`

### Sequence
Mounts children only during a specific time range. IMPORTANT: Cannot be used inside SVG!

Parameters:
- from: number - Frame to start (0-indexed)
- durationInFrames?: number - How long to show (optional, defaults to rest of video)
- name?: string - For debugging

\`\`\`javascript
import { Sequence, AbsoluteFill } from 'remotion';

function MyComponent() {
  return (
    <AbsoluteFill>
      {/* Shows from frame 0-29 */}
      <Sequence from={0} durationInFrames={30}>
        <div>First</div>
      </Sequence>
      {/* Shows from frame 30 onwards */}
      <Sequence from={30}>
        <div>Second</div>
      </Sequence>
    </AbsoluteFill>
  );
}
\`\`\`

WARNING: Never use Sequence inside <svg>! For SVG animations, use conditional rendering:
\`\`\`javascript
// WRONG - will crash:
<svg>
  <Sequence from={30}><text>Hello</text></Sequence>
</svg>

// CORRECT:
const frame = useCurrentFrame();
<svg>
  {frame >= 30 && <text>Hello</text>}
</svg>
\`\`\`

### Easing
Pre-built easing functions for interpolate().

\`\`\`javascript
import { interpolate, Easing } from 'remotion';

// Available easing functions:
Easing.linear
Easing.ease
Easing.quad       // Easing.in(Easing.quad), Easing.out(Easing.quad), Easing.inOut(Easing.quad)
Easing.cubic
Easing.sin
Easing.circle
Easing.exp
Easing.elastic
Easing.back
Easing.bounce
Easing.bezier(x1, y1, x2, y2)

// Usage:
const opacity = interpolate(frame, [0, 30], [0, 1], {
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
  extrapolateRight: 'clamp'
});
\`\`\`

### random(seed)
Generates a deterministic random number (0-1) based on a seed. Same seed = same result.

\`\`\`javascript
import { random } from 'remotion';

// Generate consistent random values
const randomX = random('x-position') * 100; // Always the same value
const randomY = random('y-position') * 100;

// Use with index for multiple items
const particles = Array.from({ length: 10 }, (_, i) => ({
  x: random(\`particle-\${i}-x\`) * 1280,
  y: random(\`particle-\${i}-y\`) * 720
}));
\`\`\`

## Common Animation Patterns

### Fade In
\`\`\`javascript
const frame = useCurrentFrame();
const opacity = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: 'clamp' });
return <div style={{ opacity }}>Content</div>;
\`\`\`

### Slide In
\`\`\`javascript
const frame = useCurrentFrame();
const translateX = interpolate(frame, [0, 30], [-100, 0], { extrapolateRight: 'clamp' });
return <div style={{ transform: \`translateX(\${translateX}px)\` }}>Content</div>;
\`\`\`

### Scale with Spring
\`\`\`javascript
const frame = useCurrentFrame();
const { fps } = useVideoConfig();
const scale = spring({ frame, fps, config: { damping: 12 } });
return <div style={{ transform: \`scale(\${scale})\` }}>Content</div>;
\`\`\`

### Staggered Animation
\`\`\`javascript
const items = ['A', 'B', 'C'];
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

return items.map((item, i) => {
  const delay = i * 10; // 10 frame delay between items
  const scale = spring({ frame: frame - delay, fps });
  return (
    <div key={item} style={{ transform: \`scale(\${Math.max(0, scale)})\` }}>
      {item}
    </div>
  );
});
\`\`\`

### Looping Animation
\`\`\`javascript
const frame = useCurrentFrame();
const loopDuration = 60; // 2 seconds at 30fps
const loopedFrame = frame % loopDuration;
const rotation = interpolate(loopedFrame, [0, loopDuration], [0, 360]);
return <div style={{ transform: \`rotate(\${rotation}deg)\` }}>Spinning</div>;
\`\`\`
`;

/**
 * Query Remotion documentation
 * Uses MCP tool when available, falls back to embedded docs
 */
export async function searchRemotonDocs(query: string): Promise<string> {
  // For now, we return the core documentation which covers most use cases
  // This could be enhanced to do more intelligent filtering based on the query

  const queryLower = query.toLowerCase();

  // Return relevant sections based on query keywords
  let relevantDocs = CORE_REMOTION_DOCS;

  // Add query-specific notes
  if (queryLower.includes('spring')) {
    relevantDocs += `\n\n## Additional Spring Notes for "${query}"
The spring() function returns values from 0 to 1 (or slightly beyond with overshoot).
To delay a spring, subtract frames: spring({ frame: frame - 30, fps })
For no bounce, use high damping (15-20) and overshootClamping: true`;
  }

  if (queryLower.includes('interpolate')) {
    relevantDocs += `\n\n## Additional Interpolate Notes for "${query}"
Always use extrapolateRight: 'clamp' to prevent values going beyond your range.
You can chain multiple interpolate calls for complex animations.
For color interpolation, use interpolateColors from 'remotion'.`;
  }

  if (queryLower.includes('sequence') || queryLower.includes('timing')) {
    relevantDocs += `\n\n## Additional Sequence Notes for "${query}"
CRITICAL: Never use <Sequence> inside <svg> elements - it will crash!
For SVG timing, use: {frame >= startFrame && <element />}
Sequence is only for HTML/React elements, not SVG elements.`;
  }

  if (queryLower.includes('svg') || queryLower.includes('animation')) {
    relevantDocs += `\n\n## SVG Animation Notes for "${query}"
SVG elements must be animated using frame-based conditional rendering.
Use transform attributes for SVG: transform={\`translate(\${x}, \${y})\`}
SVG valid elements: text, rect, circle, ellipse, line, path, g, polygon, polyline, defs, linearGradient, radialGradient, stop, filter, clipPath, mask`;
  }

  return relevantDocs;
}

